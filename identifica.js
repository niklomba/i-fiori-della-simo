'use strict';
/* I FIORI della SIMO – scanner fotografico reale, Pl@ntNet API, nessuna chiave nel repository.
   Una sola identificazione per avvio camera; le immagini non vengono trasmesse in continuo. */
(() => {
  const keyStore='simo-plantnet-key-v1';
  const endpoint='https://my-api.plantnet.org/v2/identify/all';
  const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
  const $=sel=>document.querySelector(sel);
  const apiKey=()=>{try{return localStorage.getItem(keyStore)||'';}catch(_){return '';}};
  let chosen=null, photoData='', previewUrl='', results=[], error='', busy=false, selectedOrgan='auto';
  let cameraStream=null, cameraActive=false, startingCamera=false, cameraGeneration=0, autoTimer=null;
  let cameraStatus='', capturing=false;

  function releasePhoto(){
    if(previewUrl)URL.revokeObjectURL(previewUrl);
    previewUrl='';photoData='';chosen=null;
  }
  function stopCamera(){
    cameraGeneration++;
    clearTimeout(autoTimer);autoTimer=null;
    const video=$('#scanVideo');
    if(video) {try{video.pause();video.srcObject=null;}catch(_){}}
    if(cameraStream){cameraStream.getTracks().forEach(track=>track.stop());}
    cameraStream=null;cameraActive=false;startingCamera=false;cameraStatus='';
  }
  function errorForCamera(err){
    const name=err?.name||'', message=String(err?.message||'');
    if(!window.isSecureContext)return 'La fotocamera funziona solo aprendo l’app da un collegamento HTTPS.';
    if(/NotAllowed|PermissionDenied|Security/i.test(name+message))return 'Accesso alla fotocamera negato. Consenti la fotocamera nelle impostazioni del browser, poi riprova. Puoi anche usare “Foto” per scattare con l’app Fotocamera.';
    if(/NotFound|DevicesNotFound/i.test(name+message))return 'Nessuna fotocamera disponibile. Puoi scegliere una foto dalla galleria.';
    if(/NotReadable|TrackStart|AbortError/i.test(name+message))return 'La fotocamera è già in uso oppure non si avvia. Chiudi le altre app e riprova.';
    return 'Impossibile avviare la fotocamera. Riprova oppure usa il pulsante “Foto”.';
  }
  function setCameraStatus(message){
    cameraStatus=message;
    const el=$('#scanCameraStatus');
    if(el)el.textContent=message;
  }
  function scheduleSingleScan(){
    clearTimeout(autoTimer);autoTimer=null;
    if(!cameraActive||!cameraStream||busy||capturing)return;
    const video=$('#scanVideo');
    if(!video||video.readyState<2||!video.videoWidth)return;
    if(!apiKey()){
      setCameraStatus('Fotocamera pronta. Per riconoscere la specie attiva la chiave gratuita Pl@ntNet qui sotto.');
      return;
    }
    setCameraStatus('Inquadra una sola pianta: scansione automatica fra circa 2 secondi…');
    const generation=cameraGeneration;
    autoTimer=setTimeout(()=>{
      autoTimer=null;
      if(cameraActive&&generation===cameraGeneration&&!busy)captureAndIdentify();
    },2200);
  }
  function connectCamera(){
    if(!cameraActive||!cameraStream)return;
    const video=$('#scanVideo');
    if(!video)return;
    video.srcObject=cameraStream;
    video.muted=true;
    video.setAttribute('playsinline','');
    video.onloadedmetadata=()=>scheduleSingleScan();
    video.play().then(()=>scheduleSingleScan()).catch(err=>{
      if(cameraActive)setCameraStatus('Tocca “Riconosci ora” per iniziare. '+(err?.name==='NotAllowedError'?'Il browser richiede un’interazione.':''));
    });
    if(video.readyState>=2)scheduleSingleScan();
  }
  function renderResults(){
    return '<div class="scan-results"><h2>🌿 Possibili piante riconosciute</h2>'+
      '<p class="muted tiny">Il punteggio è un indice del modello, non una garanzia di identificazione. Confronta sempre le alternative.</p>'+
      results.map((r,i)=>{
        const common=r.species?.commonNames?.[0]||r.species?.scientificNameWithoutAuthor||'Specie non indicata';
        const latin=r.species?.scientificNameWithoutAuthor||'';
        const local=window.CATALOGO_SIMO?.find(c=>c.scientifico.toLowerCase()===latin.toLowerCase());
        const score=Math.max(0,Math.min(100,Number(r.score)*100));
        const caution=i===0&&score<25?'<p class="scan-low-score">Identificazione incerta: riprova con una foto ravvicinata di fiore o foglie.</p>':'';
        return '<div class="scan-result"><div class="scan-result-row"><span class="scan-rank">'+(i+1)+'</span><div><strong>'+E(common)+'</strong><div class="latin">'+E(latin)+'</div></div><span class="scan-score">'+score.toFixed(1)+'%</span></div>'+caution+
          '<button class="btn btn-soft btn-small" type="button" data-action="recognized-plant" data-from-scan="1" data-name="'+E(common)+'" data-scientific="'+E(latin)+'" data-catalog-id="'+E(local?.id||'')+'">＋ Aggiungi al giardino</button></div>';
      }).join('')+'</div>';
  }
  function renderIfVisible(){const main=$('#main');if(main?.querySelector('.scan-page'))render(main);}
  function render(main){
    if(!main)return;
    clearTimeout(autoTimer);autoTimer=null;
    const key=apiKey();
    main.innerHTML='<div class="scan-page">'+
      '<div class="eyebrow">I FIORI della SIMO · Scanner botanico</div>'+
      '<h1>📷 Scansiona una pianta</h1>'+
      '<p class="muted">Inquadra una pianta: quando la fotocamera è pronta, l’app scatta una foto e prova a riconoscerla automaticamente. Una sola analisi per scansione.</p>'+
      (cameraActive?'<div class="plant-scanner-live">'+
          '<video id="scanVideo" autoplay muted playsinline aria-label="Inquadratura in diretta della pianta"></video>'+
          '<div class="plant-scanner-frame" aria-hidden="true"><span></span></div>'+
          '<div class="plant-scanner-live-tag">● FOTOCAMERA ATTIVA</div>'+
          '<div class="plant-scanner-tip">Metti a fuoco fiore o foglie</div>'+
          '</div><p id="scanCameraStatus" class="scan-camera-status" role="status">'+E(cameraStatus||'Avvio fotocamera…')+'</p>'+
          '<div class="scan-actions"><button class="btn btn-primary" type="button" data-id-action="snap">🌿 Riconosci ora</button>'+
          '<button class="btn btn-soft" type="button" data-id-action="stop-camera">✕ Chiudi fotocamera</button></div>'
        :'<div class="plant-scanner-start">'+
          (previewUrl?'<div class="scan-preview"><img src="'+E(previewUrl)+'" alt="Fotografia acquisita della pianta"></div>':
            '<div class="plant-scanner-start-graphic" aria-hidden="true"><span>🌿</span><div class="plant-scanner-start-frame"></div></div>')+
          '<div class="scan-actions">'+
          '<button type="button" class="btn btn-primary" data-id-action="start-camera" '+(startingCamera?'disabled':'')+'>'+
          (startingCamera?'⏳ Apertura fotocamera…':previewUrl?'📷 Nuova scansione':'📷 Avvia scanner')+'</button>'+
          '<button type="button" class="btn btn-soft" data-id-action="camera-file">📱 Foto</button>'+
          '<button type="button" class="btn btn-soft" data-id-action="gallery">🖼️ Galleria</button></div>'+
          '</div>')+
      '<input id="scanCameraFile" type="file" accept="image/*" capture="environment" hidden>'+
      '<input id="scanGallery" type="file" accept="image/*" hidden>'+
      (chosen&&!cameraActive?'<label class="scan-organ">Parte fotografata <select id="scanOrgan">'+
        [['auto','Automatica'],['flower','Fiore'],['leaf','Foglia'],['fruit','Frutto'],['bark','Corteccia']].map(([value,label])=>
          '<option value="'+value+'" '+(selectedOrgan===value?'selected':'')+'>'+label+'</option>').join('')+
        '</select></label>'+
        '<button type="button" class="btn btn-primary scan-go" data-id-action="identify" '+(busy?'disabled':'')+'>'+
        (busy?'⏳ Analisi in corso…':'🔎 Riconosci questa foto')+'</button>':'')+
      (error?'<div class="alert" role="alert">'+E(error)+'</div>':'')+
      (busy?'<div class="scan-progress" role="status"><span class="scan-spinner" aria-hidden="true"></span> Sto confrontando la fotografia con le specie botaniche…</div>':'')+
      (results.length?renderResults():'')+
      '<details class="scan-config" '+(!key?'open':'')+'><summary>⚙️ '+(key?'Riconoscimento attivo · impostazioni':'Attiva il riconoscimento fotografico gratuito')+'</summary>'+
      '<p>La fotocamera funziona sul telefono. Per identificare la specie usiamo il motore Pl@ntNet, con una chiave API gratuita personale da configurare una sola volta.</p>'+
      '<ol><li><a href="https://my.plantnet.org/" target="_blank" rel="noopener noreferrer">Apri Pl@ntNet</a> e crea un account gratuito.</li>'+
      '<li>Crea una chiave API e abilita <strong>Expose my API key (CORS)</strong>.</li>'+
      '<li>Fra gli <strong>Authorized domains</strong> indica <code>https://niklomba.github.io</code> (senza il percorso della pagina).</li>'+
      '<li>Incolla la chiave qui e premi <strong>Salva</strong>.</li></ol>'+
      '<label for="scanKey">Chiave API Pl@ntNet</label><div class="scan-key">'+
      '<input type="password" id="scanKey" autocomplete="off" placeholder="Incolla la chiave personale" value="'+E(key)+'">'+
      '<button class="btn btn-soft" type="button" data-id-action="save-key">Salva</button></div>'+
      (key?'<button type="button" class="btn btn-ghost btn-small" data-id-action="clear-key">Rimuovi chiave</button>':'')+
      '<p class="form-help">La chiave rimane nel browser del tuo dispositivo: non è inserita nel repository pubblico. Non usarla su telefoni condivisi.</p></details>'+
      '<details class="scan-guide"><summary>ℹ️ Privacy, risultati e consigli per la foto</summary>'+
      '<p>Premendo “Avvia scanner” autorizzi una singola fotografia automatica quando la camera è pronta; l’app la invia a Pl@ntNet per identificare la specie. “Foto” e “Galleria” eseguono un’analisi dopo la scelta dell’immagine. Nessuna trasmissione video continua.</p>'+
      '<p>Serve Internet per il riconoscimento. Fotografa una sola pianta, preferibilmente una foglia o un fiore, ben illuminati. Se il risultato è incerto, esegui un’altra scansione. Il diario e le piante restano salvati su questo dispositivo.</p></details>'+
      '</div>';
    $('#scanCameraFile')?.addEventListener('change',event=>choose(event.target.files?.[0]));
    $('#scanGallery')?.addEventListener('change',event=>choose(event.target.files?.[0]));
    $('#scanOrgan')?.addEventListener('change',event=>{selectedOrgan=event.target.value;});
    if(cameraActive)connectCamera();
  }
  async function startCamera(){
    if(startingCamera||busy)return;
    stopCamera();
    releasePhoto();
    results=[];error='';selectedOrgan='auto';
    const token=++cameraGeneration;
    startingCamera=true;
    renderIfVisible();
    try{
      if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Fotocamera non disponibile in questo browser.');
      let stream;
      try{
        stream=await navigator.mediaDevices.getUserMedia({
          video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:960}},audio:false
        });
      }catch(first){
        if(first?.name==='OverconstrainedError'){
          stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
        }else throw first;
      }
      if(token!==cameraGeneration || !$('#main') || !document.querySelector('.scan-page')){
        stream.getTracks().forEach(t=>t.stop());return;
      }
      cameraStream=stream;cameraActive=true;startingCamera=false;
      cameraStatus='Inquadra la pianta e tieni fermo il telefono…';
      renderIfVisible();
    }catch(err){
      if(token!==cameraGeneration)return;
      stopCamera();
      error=errorForCamera(err);
      renderIfVisible();
    }
  }
  async function selectBlob(blob){
    const objectUrl=URL.createObjectURL(blob);
    const img=new Image();
    try{
      await new Promise((resolve,reject)=>{
        img.onload=resolve;
        img.onerror=()=>reject(new Error('La fotografia non si apre.'));
        img.src=objectUrl;
      });
      const scale=Math.min(1,1600/img.naturalWidth,1600/img.naturalHeight);
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
      canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      const jpeg=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Errore conversione foto')),'image/jpeg',0.84));
      if(previewUrl)URL.revokeObjectURL(previewUrl);
      chosen=jpeg;photoData=canvas.toDataURL('image/jpeg',0.8);
      previewUrl=URL.createObjectURL(jpeg);
    }finally{URL.revokeObjectURL(objectUrl);}
  }
  async function choose(file){
    if(!file||busy)return;
    stopCamera();
    error='';results=[];
    if(!file.type.startsWith('image/')){error='Seleziona una fotografia.';renderIfVisible();return;}
    if(file.size>25*1024*1024){error='Foto troppo grande: massimo 25 MB.';renderIfVisible();return;}
    try{
      await selectBlob(file);
      renderIfVisible();
      if(apiKey())await identify();
      else{error='Foto pronta. Prima configura la chiave gratuita Pl@ntNet per riconoscere la specie.';renderIfVisible();}
    }catch(err){error='Non riesco a leggere questa fotografia: '+String(err.message||err);renderIfVisible();}
  }
  async function captureAndIdentify(){
    clearTimeout(autoTimer);autoTimer=null;
    if(!cameraActive||!cameraStream||busy||capturing)return;
    capturing=true;
    const captureGeneration=cameraGeneration;
    const video=$('#scanVideo');
    if(!video||video.readyState<2||!video.videoWidth){
      capturing=false;
      setCameraStatus('Attendo la messa a fuoco. Tieni ferma la pianta e riprova.');
      return;
    }
    try{
      const scale=Math.min(1,1600/video.videoWidth,1600/video.videoHeight);
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(video.videoWidth*scale));
      canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
      canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
      const jpeg=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Impossibile scattare.')),'image/jpeg',0.84));
      if(captureGeneration!==cameraGeneration)return;
      if(previewUrl)URL.revokeObjectURL(previewUrl);
      chosen=jpeg;
      photoData=canvas.toDataURL('image/jpeg',0.8);
      previewUrl=URL.createObjectURL(jpeg);
      stopCamera();results=[];error='';
      renderIfVisible();
      if(apiKey())await identify();
      else{error='Scatto acquisito. Configura la tua chiave gratuita Pl@ntNet per completare il riconoscimento.';renderIfVisible();}
    }catch(err){if(captureGeneration===cameraGeneration)setCameraStatus('Scatto non riuscito: '+String(err.message||err));}
    finally{capturing=false;}
  }
  async function identify(){
    if(busy||!chosen)return;
    const key=apiKey();
    if(!key){error='Configura la tua chiave API Pl@ntNet gratuita per identificare la pianta.';renderIfVisible();return;}
    if(navigator.onLine===false){error='Per il riconoscimento è necessaria una connessione Internet.';renderIfVisible();return;}
    busy=true;results=[];error='';renderIfVisible();
    const fd=new FormData();
    fd.append('images',chosen,'pianta.jpg');
    fd.append('organs',selectedOrgan);
    const ctl=new AbortController();
    const timeout=setTimeout(()=>ctl.abort(),30000);
    try{
      const url=new URL(endpoint);
      url.searchParams.set('api-key',key);
      url.searchParams.set('lang','it');
      url.searchParams.set('nb-results','5');
      const response=await fetch(url.toString(),{method:'POST',body:fd,signal:ctl.signal,cache:'no-store'});
      const body=await response.json().catch(()=>({}));
      if(!response.ok){
        const detail=String(body?.message||body?.error||'').slice(0,100);
        const message=response.status===401||response.status===403?'Chiave non autorizzata. Controlla API key, CORS e dominio autorizzato.':
          response.status===429?'Limite di richieste raggiunto. Riprova più tardi.':
          response.status===404||response.status===422?'Foto non riconosciuta. Prova a riprendere un fiore o una foglia.':
          'Servizio temporaneamente non disponibile (HTTP '+response.status+'). '+detail;
        throw new Error(message);
      }
      results=Array.isArray(body.results)?body.results.filter(r=>Number.isFinite(r?.score)&&r.species).slice(0,5):[];
      if(!results.length)error='Non ho trovato un’identificazione affidabile. Riprova con un’altra inquadratura.';
    }catch(err){
      error=err.name==='AbortError'?'La ricerca ha impiegato troppo tempo. Riprova con una connessione migliore.':
        err instanceof TypeError?'Impossibile comunicare con Pl@ntNet. Verifica la connessione e le autorizzazioni CORS della tua chiave.':
        String(err.message||err);
    }finally{clearTimeout(timeout);busy=false;renderIfVisible();}
  }
  document.addEventListener('click',event=>{
    const el=event.target.closest('[data-id-action]');if(!el)return;
    switch(el.dataset.idAction){
      case 'start-camera':startCamera();break;
      case 'stop-camera':stopCamera();renderIfVisible();break;
      case 'snap':captureAndIdentify();break;
      case 'camera-file':$('#scanCameraFile')?.click();break;
      case 'gallery':$('#scanGallery')?.click();break;
      case 'identify':identify();break;
      case 'save-key':{
        const key=$('#scanKey')?.value?.trim();
        if(!key){error='Incolla una chiave Pl@ntNet valida.';renderIfVisible();break;}
        try{localStorage.setItem(keyStore,key);error='';renderIfVisible();}
        catch(_){error='Impossibile salvare la chiave sul dispositivo. Consenti la memorizzazione dei dati del sito.';renderIfVisible();}
        break;
      }
      case 'clear-key':
        try{localStorage.removeItem(keyStore);}catch(_){}
        error='';renderIfVisible();break;
    }
  });
  window.addEventListener('pagehide',stopCamera);
  window.SIMO_ID={
    render,
    stopCamera,
    getPhoto:()=>photoData,
    pendingPhoto:''
  };
})();
