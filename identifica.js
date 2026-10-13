'use strict';
/* Identificazione reale tramite Pl@ntNet, con chiave personale e consenso all'invio della foto.
   Senza chiave/non connessi la funzione non inventa alcuna identificazione. */
(() => {
 const keyStore='simo-plantnet-key-v1';
 let chosen=null, previewUrl='', results=[], error='', busy=false, selectedOrgan='auto';
 let photoData='';
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const escapeAttr=E;
 const id='https://my-api.plantnet.org/v2/identify/all';
 const apiKey=()=>localStorage.getItem(keyStore)||'';
 const $=sel=>document.querySelector(sel);
 const hasInternet=()=>navigator.onLine!==false;
 function render(main){
  const key=apiKey();
  main.innerHTML=`<div class="scan-page">
   <div class="eyebrow">I FIORI della SIMO · Riconoscimento</div>
   <h1>Che pianta è? 📷</h1>
   <p class="muted">Scatta una foto nitida di fiore o foglia: l'analisi mostra le specie più probabili.</p>
   <div class="scan-actions">
     <button type="button" class="btn btn-primary" data-id-action="camera">📷 Scatta foto</button>
     <button type="button" class="btn btn-soft" data-id-action="gallery">🖼️ Scegli foto</button>
   </div>
   <input id="scanCamera" type="file" accept="image/*" capture="environment" hidden>
   <input id="scanGallery" type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden>
   ${previewUrl?`<div class="scan-preview"><img src="${escapeAttr(previewUrl)}" alt="La fotografia selezionata per il riconoscimento"></div>`:'<div class="scan-placeholder">🌿 <span>La fotografia apparirà qui</span></div>'}
   ${chosen?`<label class="scan-organ">Che parte stai fotografando? <select id="scanOrgan"><option value="auto" ${selectedOrgan==='auto'?'selected':''}>Riconosci automaticamente</option><option value="flower" ${selectedOrgan==='flower'?'selected':''}>Fiore</option><option value="leaf" ${selectedOrgan==='leaf'?'selected':''}>Foglia</option><option value="fruit" ${selectedOrgan==='fruit'?'selected':''}>Frutto</option><option value="bark" ${selectedOrgan==='bark'?'selected':''}>Corteccia</option></select></label>`:''}
   <details class="scan-config" ${key?'':'open'}><summary>⚙️ ${key?'Chiave Pl@ntNet configurata · impostazioni':'Attiva il riconoscimento gratuito'}</summary>
    <p>Pl@ntNet offre gratuitamente fino a <strong>500 identificazioni al giorno</strong>. Per collegarlo serve un account sviluppatore Pl@ntNet gratuito, distinto dall'app.</p>
    <ol><li><a href="https://my.plantnet.org/" target="_blank" rel="noopener noreferrer">Crea o apri l'account Pl@ntNet</a> e genera la tua API key.</li><li>Nelle impostazioni della chiave abilita <strong>Expose my API key (CORS)</strong>.</li><li>Tra gli <strong>Authorized domains</strong> inserisci <code>https://niklomba.github.io</code> (senza percorso finale).</li><li>Incolla la chiave qui, poi premi Salva.</li></ol>
    <label for="scanKey">Chiave API personale</label>
    <div class="scan-key"><input type="password" id="scanKey" autocomplete="off" placeholder="Incolla la tua API key" value="${escapeAttr(key)}"><button class="btn btn-soft" type="button" data-id-action="save-key">Salva</button></div>
    <p class="form-help">La chiave resta in questo browser, non viene pubblicata su GitHub. È leggibile da chi ha accesso ai dati del browser: non inserirla in dispositivi condivisi. In caso di sospetto abuso, rigenerala su Pl@ntNet.</p>
    ${key?'<button type="button" class="btn btn-ghost btn-small" data-id-action="clear-key">Rimuovi chiave</button>':''}
   </details>
   <p class="form-help">La tua foto viene inviata a Pl@ntNet <strong>solo quando premi Identifica</strong>. È necessario Internet. Il risultato è una stima, non una conferma botanica certa. I dati del tuo giardino continuano a rimanere nel browser.</p>
   <button type="button" class="btn btn-primary scan-go" data-id-action="identify" ${chosen&&!busy?'':'disabled'}>${busy?'⏳ Analisi in corso…':'🔎 Identifica questa pianta'}</button>
   ${error?`<div class="alert" role="alert">${E(error)}</div>`:''}
   <div id="scanResults">${results.length?renderResults():''}</div>
   <details class="scan-guide"><summary>💡 Come ottenere foto migliori</summary><p>Fotografa un solo esemplare, ben illuminato, mettendo a fuoco fiori o foglie. Evita foto con molte piante sovrapposte e verifica sempre le alternative.</p></details>
  </div>`;
  $('#scanCamera').addEventListener('change',e=>choose(e.target.files[0]));
  $('#scanGallery').addEventListener('change',e=>choose(e.target.files[0]));
  $('#scanOrgan')?.addEventListener('change',e=>selectedOrgan=e.target.value);
 }
 function renderResults(){return `<div class="scan-results"><h2>Possibili identificazioni</h2><p class="muted tiny">Il punteggio del modello non garantisce una probabilità statistica esatta. Confronta le immagini e i dettagli.</p>${results.map((r,i)=>{
   const common=r.species?.commonNames?.[0]||r.species?.scientificNameWithoutAuthor||'Specie non indicata';
   const latin=r.species?.scientificNameWithoutAuthor||'';
   const local=window.CATALOGO_SIMO?.find(c=>c.scientifico.toLowerCase()===latin.toLowerCase());
   return `<div class="scan-result"><div class="scan-result-row"><span class="scan-rank">${i+1}</span><div><strong>${E(common)}</strong><div class="latin">${E(latin)}</div></div><span class="scan-score">${(r.score*100).toFixed(1)}%</span></div>
   <button class="btn btn-soft btn-small" type="button" data-action="recognized-plant" data-from-scan="1" data-name="${escapeAttr(common)}" data-scientific="${escapeAttr(latin)}" data-catalog-id="${escapeAttr(local?.id||'')}">＋ Aggiungi al giardino</button></div>`;
  }).join('')}</div>`;}
 async function choose(file){if(!file)return;error='';results=[];if(!file.type.startsWith('image/')){error='Seleziona un file immagine.';render($('#main'));return;}
  if(file.size>25*1024*1024){error='La foto è troppo grande (max 25 MB).';render($('#main'));return;}
  try{
   const url=URL.createObjectURL(file);const img=new Image();
   await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Foto non leggibile'));img.src=url;});
   const scale=Math.min(1,1400/img.width,1400/img.height);
   const cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(img.width*scale));cv.height=Math.max(1,Math.round(img.height*scale));
   cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
   const data=cv.toDataURL('image/jpeg',0.83);photoData=data;
   chosen=await (await fetch(data)).blob();
   if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(chosen);URL.revokeObjectURL(url);
  }catch(e){error='Immagine non leggibile: '+e.message;chosen=null;photoData='';}
  if($('#main'))render($('#main'));
 }
 async function identify(){if(!chosen){error='Prima scegli una foto.';render($('#main'));return;}
   const key=apiKey();if(!key){error='Configura prima la tua API key gratuita Pl@ntNet.';render($('#main'));return;}
   if(!hasInternet()){error='La connessione Internet è necessaria per riconoscere una pianta.';render($('#main'));return;}
   busy=true;error='';results=[];render($('#main'));
   const fd=new FormData();fd.append('images',chosen,'pianta.jpg');fd.append('organs',selectedOrgan);
   const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),30000);
   try{
     const u=new URL(id);u.searchParams.set('api-key',key);u.searchParams.set('lang','it');u.searchParams.set('nb-results','5');
     const r=await fetch(u.toString(),{method:'POST',body:fd,signal:controller.signal});
     const body=await r.json().catch(()=>({}));
     if(!r.ok){const message=body?.message||body?.error||'';throw new Error(r.status===401||r.status===403?'Chiave non autorizzata: controlla API key, CORS e dominio autorizzato.':r.status===429?'Limite giornaliero raggiunto: riprova domani.':r.status===404?'Nessuna specie riconosciuta. Prova con una foto migliore.':`Servizio non disponibile (HTTP ${r.status}). ${String(message).slice(0,100)}`);}
     results=Array.isArray(body.results)?body.results.slice(0,5).filter(r=>Number.isFinite(r.score)&&r.species):[];
     if(!results.length)error='Nessuna identificazione attendibile restituita. Prova un’altra foto.';
   }catch(e){error=e.name==='AbortError'?'La richiesta è scaduta. Riprova con una connessione migliore.':e instanceof TypeError?'Connessione bloccata o indisponibile. Controlla le impostazioni CORS del tuo account Pl@ntNet.':e.message;}
   finally{clearTimeout(timeout);busy=false;render($('#main'));}
 }
 document.addEventListener('click',e=>{
  const el=e.target.closest('[data-id-action]');if(!el)return;
  if(el.dataset.idAction==='camera')$('#scanCamera')?.click();
  if(el.dataset.idAction==='gallery')$('#scanGallery')?.click();
  if(el.dataset.idAction==='identify')identify();
  if(el.dataset.idAction==='save-key'){const k=$('#scanKey')?.value?.trim();if(!k){error='Incolla una chiave valida.';}else{localStorage.setItem(keyStore,k);error='';}render($('#main'));}
  if(el.dataset.idAction==='clear-key'){localStorage.removeItem(keyStore);error='';render($('#main'));}
 });
 window.SIMO_ID={render,getPhoto:()=>photoData,pendingPhoto:''};
})();
