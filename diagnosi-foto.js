'use strict';
/* Diagnosi fotografica Pl@ntNet: ipotesi, non prescrizioni fitosanitarie. */
(() => {
  const keyStore='simo-plantnet-key-v1';
  const api='https://my-api.plantnet.org/v2/diseases/identify';
  const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
  const $=sel=>document.querySelector(sel);
  const apiKey=()=>{try{return localStorage.getItem(keyStore)||'';}catch(_){return '';}};
  let stream=null, image=null, photoPreview='', candidates=[], issue='', inProgress=false;
  let generation=0, autoTimer=null, cameraStarting=false, cameraLive=false, snapshotting=false;
  let chosenPlantId='', organ='auto', lastPhotoName='';
  function visible(){return !!$('#main')?.querySelector('.diagnosis-screen');}
  function renderVisible(){if(visible())render($('#main'));}
  function stopCamera(){
    generation++;clearTimeout(autoTimer);autoTimer=null;
    const video=$('#diagVideo');
    if(video){try{video.pause();video.srcObject=null;}catch(_){}}
    if(stream)stream.getTracks().forEach(t=>t.stop());
    stream=null;cameraLive=false;cameraStarting=false;
  }
  const bestCandidate=()=>candidates[0]||null;
  function specificFirstAid(top){
    const name=String((top?.description||top?.label||top?.name)||'').toLowerCase();
    let message='';
    if(/aphis|afid|aphid|coccinigli|coccid|mealybug|scale insect/.test(name))
      message='Possibile presenza di insetti succhiatori: ispeziona il retro delle foglie e i germogli; se gli insetti sono confermati e pochi, rimuovili delicatamente a mano o con un panno umido, senza danneggiare la pianta.';
    else if(/oidio|powdery mildew|erysiph|uncinul|peronospor|downy mildew/.test(name))
      message='Possibile problema fungino: evita di bagnare regolarmente le foglie, migliora la circolazione d’aria e separa temporaneamente la pianta se i sintomi aumentano.';
    else if(/rust|ruggine|puccin|tranzsch|macchi|spot|anthrac|antrac/.test(name))
      message='Possibili lesioni o macchie: ispeziona foglie nuove e vecchie, annota l’evoluzione e verifica ristagni o bagnature prolungate. Non applicare fungicidi senza confermare la causa.';
    if(!message)return '';
    return '<div class="diagnosis-first-aid"><strong>Primo intervento prudente, solo se i sintomi corrispondono</strong><p>'+E(message)+'</p></div>';
  }
  function guidance(){
    return '<div class="diagnosis-safety">'+
      '<strong>Primi controlli sicuri</strong><ul>'+
      '<li>Controlla terra, drenaggio, luce e temperatura prima di intervenire: anche stress ambientali imitano malattie.</li>'+
      '<li>Se sospetti parassiti o contagio, separa temporaneamente la pianta dalle altre e osserva il retro delle foglie.</li>'+
      '<li>Evita concimi extra, antiparassitari o fungicidi senza conferma. Se il problema peggiora, consulta un vivaista o un esperto fitosanitario.</li>'+
      '</ul><p>La diagnosi da foto non valuta radici o laboratorio; il servizio identifica soltanto un insieme limitato di malattie e parassiti.</p></div>';
  }
  function resultsHTML(){
    const top=bestCandidate();
    if(!top)return '';
    const plantChoices=(window.SIMO_DIAG_PLANTS?.()||[]);
    return '<section class="diagnosis-results"><h2>Possibili cause riconosciute</h2>'+
      '<div class="hint">Risultati preliminari di Pl@ntNet: il punteggio indica la classificazione del modello, non una diagnosi certa. Non sempre una pianta mostra una malattia identificabile da questo servizio.</div>'+
      candidates.map((r,i)=>{
        const label=r.description||r.label||r.name||'Risultato non specificato';
        const code=r.name&&r.name!==label?' · '+r.name:'';
        const score=Math.max(0,Math.min(100,Number(r.score)*100));
        return '<article class="diagnosis-result"><span class="scan-rank">'+(i+1)+'</span><div><strong>'+E(label)+'</strong><div class="muted tiny">Codice diagnostico'+E(code)+'</div><span class="scan-score">'+score.toFixed(1)+'% indice del modello</span></div></article>';
      }).join('')+
      specificFirstAid(top)+guidance()+
      (plantChoices.length?
      '<div class="diagnosis-save"><label for="diagnosisPlant">Salva il risultato nel diario di una pianta</label><select id="diagnosisPlant"><option value="">Seleziona una pianta</option>'+
      plantChoices.map(p=>'<option value="'+E(p.id)+'" '+(p.id===chosenPlantId?'selected':'')+'>'+E(p.name)+'</option>').join('')+
      '</select><button class="btn btn-soft" type="button" data-action="save-diagnosis">📝 Salva nel diario</button></div>':'')+
      '</section>';
  }
  function render(main){
    if(!main)return;
    clearTimeout(autoTimer);autoTimer=null;
    const key=apiKey();
    main.innerHTML='<div class="diagnosis-screen">'+
      '<div class="eyebrow">Salute e benessere delle piante</div>'+
      '<h1>🩺 Diagnosi da foto</h1>'+
      '<p class="muted">Foglie macchiate, ingiallite o insetti? Inquadra la parte interessata e cerca possibili cause con Pl@ntNet.</p>'+
      (!key?'<div class="alert"><strong>Collegamento da attivare:</strong> per usare la diagnosi fotografica devi prima salvare la chiave Pl@ntNet nella sezione Identifica. È la stessa chiave: non serve un secondo account. <button type="button" class="btn btn-small btn-soft" data-view="identifica">Configura</button></div>':'')+
      (cameraLive?'<div class="plant-scanner-live"><video id="diagVideo" autoplay muted playsinline aria-label="Fotocamera per osservare sintomi della pianta"></video><div class="plant-scanner-frame" aria-hidden="true"></div><div class="plant-scanner-live-tag">● OSSERVA I SINTOMI</div><div class="plant-scanner-tip">Inquadra da vicino foglie, fusto o parassiti</div></div>'+
        '<div id="diagnosisCameraStatus" class="scan-camera-status" role="status">Inquadra il problema. Scatto automatico dopo circa 2 secondi.</div>'+
        '<div class="scan-actions"><button type="button" class="btn btn-primary" data-disease-action="snap">📷 Analizza ora</button><button type="button" class="btn btn-soft" data-disease-action="stop">Chiudi camera</button></div>'
        :'<div class="diagnosis-start">'+
        (photoPreview?'<img class="diagnosis-preview" src="'+E(photoPreview)+'" alt="Immagine dei sintomi sulla pianta">':'<div class="diagnosis-placeholder"><span aria-hidden="true">🍃</span><strong>Fotografa il problema</strong><small>Meglio una foglia o un dettaglio ben a fuoco</small></div>')+
        '<div class="diagnosis-start-actions"><button class="btn btn-primary" type="button" data-disease-action="start">'+(cameraStarting?'Apertura fotocamera…':'📷 Avvia diagnosi')+'</button>'+
        '<button class="btn btn-soft" type="button" data-disease-action="camera-file">📱 Foto</button>'+
        '<button class="btn btn-soft" type="button" data-disease-action="gallery">🖼️ Galleria</button></div></div>')+
      '<input type="file" id="diagnosisCameraFile" accept="image/*" capture="environment" hidden><input type="file" id="diagnosisGallery" accept="image/*" hidden>'+
      (image&&!cameraLive?'<div class="diagnosis-photo-controls"><label for="diagnosisOrgan">Parte della pianta</label><select id="diagnosisOrgan">'+
        [['auto','Automatico'],['leaf','Foglia'],['flower','Fiore'],['fruit','Frutto'],['bark','Fusto / corteccia']].map(([code,name])=>'<option value="'+code+'" '+(code===organ?'selected':'')+'>'+name+'</option>').join('')+
        '</select><button class="btn btn-primary" data-disease-action="identify" type="button" '+(inProgress?'disabled':'')+'>'+(inProgress?'⏳ Analisi in corso…':'🔎 Analizza i sintomi')+'</button></div>':'')+
      (inProgress?'<div class="scan-progress" role="status"><span class="scan-spinner"></span>Sto confrontando i sintomi con i dati disponibili…</div>':'')+
      (issue?'<div class="alert" role="alert">'+E(issue)+'</div>':'')+
      resultsHTML()+
      '<details class="scan-guide"><summary>🌿 Diagnosi guidata senza foto</summary><p>Per foglie gialle, punte secche, macchie e insetti puoi usare anche la nostra guida interattiva gratuita, disponibile offline.</p><button type="button" class="btn btn-soft" data-view="sintomi">Apri guida ai sintomi</button></details>'+
      '<p class="form-help">La fotografia viene inviata a Pl@ntNet solo dopo aver avviato l’analisi. È necessaria Internet. Questo controllo non sostituisce un esperto e non prescrive prodotti chimici.</p>'+
      '</div>';
    $('#diagnosisCameraFile')?.addEventListener('change',event=>choose(event.target.files?.[0]));
    $('#diagnosisGallery')?.addEventListener('change',event=>choose(event.target.files?.[0]));
    $('#diagnosisOrgan')?.addEventListener('change',event=>{organ=event.target.value;});
    $('#diagnosisPlant')?.addEventListener('change',event=>chosenPlantId=event.target.value);
    if(cameraLive)connectCamera();
  }
  function setStatus(value){const el=$('#diagnosisCameraStatus');if(el)el.textContent=value;}
  function connectCamera(){
    const video=$('#diagVideo');if(!video||!stream)return;
    video.srcObject=stream;video.muted=true;
    video.onloadedmetadata=()=>queueAutoCapture();
    video.play().then(queueAutoCapture).catch(()=>setStatus('Tocca “Analizza ora” per acquisire l’immagine.'));
    if(video.readyState>=2)queueAutoCapture();
  }
  function queueAutoCapture(){
    clearTimeout(autoTimer);
    const video=$('#diagVideo');if(!video||!video.videoWidth||!cameraLive||snapshotting)return;
    if(!apiKey()){setStatus('Fotocamera pronta. Configura prima la chiave Pl@ntNet per analizzare la pianta.');return;}
    const token=generation;
    autoTimer=setTimeout(()=>{autoTimer=null;if(cameraLive&&token===generation)capture();},2300);
  }
  async function startCamera(){
    if(cameraStarting||inProgress)return;
    stopCamera();issue='';candidates=[];cameraStarting=true;const token=++generation;renderVisible();
    try{
      if(!navigator.mediaDevices?.getUserMedia||!window.isSecureContext)throw new Error('Il browser non supporta la fotocamera. Apri il sito con HTTPS in Chrome o Safari.');
      let target;
      try{target=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false});}
      catch(e){if(e?.name==='OverconstrainedError')target=await navigator.mediaDevices.getUserMedia({video:true,audio:false});else throw e;}
      if(token!==generation||!visible()){target.getTracks().forEach(t=>t.stop());return;}
      stream=target;cameraLive=true;cameraStarting=false;renderVisible();
    }catch(e){
      if(token!==generation)return;
      stopCamera();issue=/NotAllowed|PermissionDenied/i.test(e.name||'')?
        'Fotocamera non autorizzata. Consenti l’accesso nelle impostazioni del browser. Puoi usare Foto oppure Galleria.':
        String(e.message||'Impossibile aprire la fotocamera.');renderVisible();
    }
  }
  function blobToJPEG(source){
    return new Promise((resolve,reject)=>{
      const src=URL.createObjectURL(source),img=new Image();
      img.onload=()=>{
        try{
          const ratio=Math.min(1,1600/img.naturalWidth,1600/img.naturalHeight);
          const c=document.createElement('canvas');
          c.width=Math.max(1,Math.round(img.naturalWidth*ratio));
          c.height=Math.max(1,Math.round(img.naturalHeight*ratio));
          c.getContext('2d').drawImage(img,0,0,c.width,c.height);
          c.toBlob(blob=>{URL.revokeObjectURL(src);blob?resolve(blob):reject(new Error('Immagine non valida.'));},'image/jpeg',.82);
        }catch(e){URL.revokeObjectURL(src);reject(e);}
      };
      img.onerror=()=>{URL.revokeObjectURL(src);reject(new Error('Foto non leggibile.'));};
      img.src=src;
    });
  }
  function newImage(blob){
    if(photoPreview)URL.revokeObjectURL(photoPreview);
    photoPreview=URL.createObjectURL(blob);
    image=blob;lastPhotoName='Fotografia scattata';
  }
  async function choose(file){
    if(!file||inProgress)return;
    stopCamera();issue='';candidates=[];
    if(!file.type.startsWith('image/')||file.size>25*1024*1024){issue='Scegli un’immagine valida di massimo 25 MB.';renderVisible();return;}
    try{newImage(await blobToJPEG(file));renderVisible();if(apiKey())await identify();else{issue='Foto pronta. Configura la chiave Pl@ntNet in Identifica.';renderVisible();}}
    catch(e){issue=String(e.message||e);renderVisible();}
  }
  async function capture(){
    clearTimeout(autoTimer);autoTimer=null;
    if(!cameraLive||!stream||snapshotting||inProgress)return;
    const video=$('#diagVideo');
    if(!video||!video.videoWidth||video.readyState<2){setStatus('Attendi che la camera metta a fuoco, poi riprova.');return;}
    snapshotting=true;const token=generation;
    try{
      const ratio=Math.min(1,1600/video.videoWidth,1600/video.videoHeight);
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(video.videoWidth*ratio));
      canvas.height=Math.max(1,Math.round(video.videoHeight*ratio));
      canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
      const blob=await new Promise((res,rej)=>canvas.toBlob(b=>b?res(b):rej(new Error('Scatto non riuscito.')),'image/jpeg',.82));
      if(token!==generation)return;
      newImage(blob);stopCamera();issue='';renderVisible();
      if(apiKey())await identify();else{issue='Scatto pronto. Configura la chiave Pl@ntNet in Identifica.';renderVisible();}
    }catch(e){if(token===generation)setStatus(String(e.message||e));}
    finally{snapshotting=false;}
  }
  async function identify(){
    if(inProgress||!image)return;
    const key=apiKey();
    if(!key){issue='Per la diagnosi fotografica configura la chiave API Pl@ntNet da Identifica.';renderVisible();return;}
    if(navigator.onLine===false){issue='Connessione Internet necessaria per la diagnosi fotografica.';renderVisible();return;}
    inProgress=true;issue='';candidates=[];renderVisible();
    const form=new FormData();
    form.append('images',image,'sintomi.jpg');
    form.append('organs',organ);
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),30000);
    try{
      const url=new URL(api);
      url.searchParams.set('api-key',key);
      url.searchParams.set('lang','it');
      url.searchParams.set('nb-results','5');
      const response=await fetch(url.toString(),{method:'POST',body:form,signal:controller.signal,cache:'no-store'});
      const data=await response.json().catch(()=>({}));
      if(!response.ok){
        throw new Error(response.status===401||response.status===403?
          'La chiave non è autorizzata: verifica CORS e dominio su Pl@ntNet.':
          response.status===429?'Limite giornaliero raggiunto: riprova più tardi.':
          response.status===404||response.status===422?'Non posso identificare il problema con questa foto: prova un’altra inquadratura.':
          'Il servizio ha risposto con errore HTTP '+response.status+'. '+String(data.message||'').slice(0,110));
      }
      candidates=Array.isArray(data.results)?data.results.filter(r=>Number.isFinite(r?.score)).slice(0,5):[];
      if(!candidates.length)issue='Nessuna malattia riconosciuta nel catalogo limitato di Pl@ntNet. Questo non significa che la pianta sia sana: usa la guida ai sintomi o confrontati con un esperto.';
    }catch(e){issue=e.name==='AbortError'?'Tempo di attesa scaduto. Riprova.':
      e instanceof TypeError?'Connessione o autorizzazione CORS non disponibile. Verifica la configurazione Pl@ntNet.':String(e.message||e);
    }finally{clearTimeout(timeout);inProgress=false;renderVisible();}
  }
  function noteText(){
    if(!candidates.length)return '';
    return 'Diagnosi fotografica preliminare ('+new Date().toLocaleDateString('it-IT')+'): '+
      candidates.map(c=>(c.description||c.label||c.name||'Non specificato')+' ('+(c.score*100).toFixed(1)+'%)').join('; ')+
      '. Risultati non confermati, verificare sintomi reali. Fonte: Pl@ntNet.';
  }
  document.addEventListener('click',e=>{
    const el=e.target.closest('[data-disease-action]');if(!el)return;
    switch(el.dataset.diseaseAction){
      case 'start':startCamera();break;
      case 'stop':stopCamera();renderVisible();break;
      case 'snap':capture();break;
      case 'camera-file':$('#diagnosisCameraFile')?.click();break;
      case 'gallery':$('#diagnosisGallery')?.click();break;
      case 'identify':identify();break;
    }
  });
  window.addEventListener('pagehide',stopCamera);
  window.SIMO_DIAG={render,stopCamera,noteText,getChosenPlant:()=>$('#diagnosisPlant')?.value||chosenPlantId,getResults:()=>candidates};
})();
