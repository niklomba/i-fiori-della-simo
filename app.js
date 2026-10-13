'use strict';
(() => {
  const DB_NAME='i-fiori-della-simo-v1', STORE='records', KEY='stato';
  const catalog=window.CATALOGO_SIMO || [];
  const blankState=()=>({schema:1,plants:[],events:[],createdAt:new Date().toISOString()});
  let state=blankState();
  let view='oggi';
  let gardenQuery='', catalogQuery='', gardenFilter='tutte', catalogFilter='tutte', catalogShown=24;
  let toastTimer;
  let db;
  let lastCareEventId='';
  let careSaving=false;
  const $=sel=>document.querySelector(sel);
  const main=$('#main'), modal=$('#modal'), modalContent=$('#modalContent');
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const attr=v=>esc(v);
  const uid=()=> (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID(): Date.now().toString(36)+'_'+Math.random().toString(36).slice(2));
  const dateLocal=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const addDays=(iso,count)=>{const [y,m,d]=iso.split('-').map(Number);const x=new Date(y,m-1,d+count,12);return dateLocal(x)};
  const dayDiff=(dateA,dateB)=>{const a=new Date(dateA+'T12:00:00');const b=new Date(dateB+'T12:00:00');return Math.round((a-b)/86400000)};
  const showDate=(iso,opts={day:'numeric',month:'long'})=>{if(!iso)return 'Non indicata';return new Date(iso+'T12:00:00').toLocaleDateString('it-IT',opts)};
  const dateLong=()=>new Date().toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const species=p=>catalog.find(c=>c.id===p.catalogId);
  const plantName=p=>p.nickname || p.species || 'Pianta senza nome';
  const defaultLocation='Balcone';
  const hasPhoto=p=>typeof p.photo==='string' && /^data:image\/(jpeg|png|webp);base64,/i.test(p.photo);
  const photoOrEmoji=(p,clazz='task-image')=>hasPhoto(p)?`<img class="${clazz}" src="${attr(p.photo)}" alt="Fotografia di ${attr(plantName(p))}">`:`<span class="${clazz}" aria-hidden="true">${species(p)?.emoji||'🪴'}</span>`;

  function openDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});}
  function transaction(mode,work){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode);const request=work(tx.objectStore(STORE));tx.oncomplete=()=>resolve(request?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
  async function save(){await transaction('readwrite',store=>store.put(state,KEY));}
  async function load(){const v=await transaction('readonly',store=>store.get(KEY));if(v){state=v;state.plants=Array.isArray(state.plants)?state.plants:[];state.events=Array.isArray(state.events)?state.events:[];}else await save();}
  function toast(message){clearTimeout(toastTimer);const t=$('#toast');t.textContent=message;t.hidden=false;toastTimer=setTimeout(()=>t.hidden=true,3300);}
  function toastUndo(message,eventId){
    clearTimeout(toastTimer);
    const t=$('#toast');
    t.textContent=message;
    const button=document.createElement('button');
    button.type='button';button.className='toast-undo-button';
    button.textContent='↶ Annulla';
    button.dataset.action='undo-care';button.dataset.eventId=eventId;
    t.append(button);t.hidden=false;
    toastTimer=setTimeout(()=>t.hidden=true,8500);
  }
  function recentCareNotice(){
    const e=state.events.find(e=>e.id===lastCareEventId);
    if(!e||!['water','feed'].includes(e.type))return '';
    const p=state.plants.find(p=>p.id===e.plantId);
    if(!p)return '';
    const name=e.type==='water'?'Annaffiatura':'Concimazione';
    return `<div class="care-undo-notice" role="status"><span><strong>✓ ${name} registrata</strong><small>${esc(plantName(p))} · ${showDate(e.date)} · Hai sbagliato?</small></span><button type="button" class="btn btn-small care-undo-button" data-action="undo-care" data-event-id="${attr(e.id)}">↶ Annulla</button></div>`;
  }
  function errorToast(e){console.error(e);toast('Impossibile salvare. Controlla lo spazio disponibile sul dispositivo.');}
  function setView(next){if(view==='identifica'&&next!=='identifica')window.SIMO_ID?.stopCamera?.();if(view==='diagnosi'&&next!=='diagnosi')window.SIMO_DIAG?.stopCamera?.();view=next;document.querySelectorAll('[data-view]').forEach(el=>{const active=el.dataset.view===next;el.classList.toggle('active',active);if(el.classList.contains('nav-button'))el.setAttribute('aria-current',active?'page':'false')});render();window.scrollTo({top:0,behavior:'instant'});}
  function btn(label,action,extra='',css='btn-primary'){return `<button type="button" class="btn ${css}" data-action="${action}" ${extra}>${label}</button>`;}
  function header(title,subtitle,button=''){return `<div class="page-title"><div><div class="eyebrow">I FIORI della SIMO</div><h1>${title}</h1></div>${button}</div><p class="section-intro">${subtitle}</p>`;}
  function empty(emoji,title,message,action,button){return `<div class="empty"><div class="empty-icon">${emoji}</div><h2>${title}</h2><p>${message}</p>${action?btn(button,action):''}</div>`;}
  function render(){switch(view){case 'giardino':renderGarden();break;case 'calendario':renderCalendar();break;case 'enciclopedia':renderCatalog();break;case 'identifica':window.SIMO_ID.render(main);break;case 'altro':renderOther();break;case 'diagnosi':window.SIMO_DIAG.render(main);break;case 'sintomi':renderDiagnosis();break;default:renderToday();}}

  function nextDate(p,type){const interval=Number(type==='water'?p.waterInterval:p.feedInterval);if(!Number.isFinite(interval)||interval<1)return null;const base=(type==='water'?p.lastWater:p.lastFeed)||p.createdOn||dateLocal();return addDays(base,interval);}
  function tasks(){const result=[];for(const p of state.plants){for(const type of ['water','feed']){const date=nextDate(p,type);if(date)result.push({p,type,date,days:dayDiff(date,dateLocal())});}}return result.sort((a,b)=>a.date.localeCompare(b.date));}
  function taskRow(t){const isWater=t.type==='water';const label=isWater?'💧 Irrigazione':'🌱 Concimazione';const badge=t.days<0?`<span class="pill orange">${Math.abs(t.days)} g di ritardo</span>`:t.days===0?'<span class="pill pink">Oggi</span>':`<span class="pill">Fra ${t.days} g</span>`;
    return `<div class="task">${photoOrEmoji(t.p)}<div class="task-info"><strong>${esc(plantName(t.p))}</strong><span>${label} · ${esc(t.p.location||'Posizione non indicata')} · ${showDate(t.date)}</span></div>${badge}<div class="task-actions"><button class="btn btn-small btn-soft" data-action="do-task" data-id="${attr(t.p.id)}" data-type="${t.type}" aria-label="Segna ${isWater?'irrigazione':'concimazione'} fatta per ${attr(plantName(t.p))}">Fatto ✓</button></div></div>`;
  }
  function renderToday(){const due=tasks().filter(t=>t.days<=0);main.innerHTML=`
    <div class="home-welcome"><div class="eyebrow">${esc(dateLong())}</div><h1>Il tuo giardino, ogni giorno 🌿</h1><p>Identifica, controlla la salute e prenditi cura delle piante.</p></div><div class="home-main-actions"><button data-view="identifica" class="home-main-action"><span>📷</span><strong>Scansiona</strong><small>Identifica una pianta</small></button><button data-view="diagnosi" class="home-main-action"><span>🩺</span><strong>Diagnosi</strong><small>Controlla una malattia</small></button><button data-view="giardino" class="home-main-action"><span>🪴</span><strong>Le mie piante</strong><small>Cure e diario</small></button></div>
    <div class="quick-stats"><button data-view="giardino" class="quick-stat"><span>🪴</span><div><strong>${state.plants.length} ${state.plants.length===1?'pianta':'piante'}</strong><small>Il mio giardino</small></div>→</button><button data-view="enciclopedia" class="quick-stat"><span>📚</span><div><strong>${catalog.length} specie</strong><small>Enciclopedia offline</small></div>→</button></div>
    ${recentCareNotice()}
    <section><div class="section-head"><h2>Cure da controllare ${due.length?'('+due.length+')':''}</h2><button class="btn-link" data-action="calendar">Calendario →</button></div>
    ${due.length?`<div class="due-list">${due.map(taskRow).join('')}</div>`:`<div class="hint">${state.plants.length?'Nessuna cura in scadenza oggi. Verifica comunque il terreno prima di irrigare.':'Aggiungi la tua prima pianta per pianificare le cure.'} <button class="btn btn-small btn-soft" data-action="new-plant">＋ Pianta</button></div>`}</section>
    <details class="home-more"><summary>Altri strumenti</summary><div class="home-more-inner"><button data-view="sintomi" class="btn btn-soft">🌱 Guida ai sintomi</button><button data-view="calendario" class="btn btn-soft">📅 Calendario</button><button data-view="enciclopedia" class="btn btn-soft">📚 Enciclopedia</button></div></details>
    `;
  }

  function plantCard(p){const sp=species(p);const due=nextDate(p,'water');return `<article class="plant-card"><div class="plant-cover">${hasPhoto(p)?`<img src="${attr(p.photo)}" alt="${attr(plantName(p))}">`:`<span class="emoji">${sp?.emoji||'🪴'}</span>`}<span class="cover-label">${esc(p.location||'La mia pianta')}</span></div><div class="plant-content"><div class="eyebrow">${esc(p.location||'La mia pianta')}</div><h3>${esc(plantName(p))}</h3><p>${esc(p.species||'Specie non indicata')}</p><div class="plant-card-footer"><span class="plant-subtitle">💧 ${due?showDate(due):'Da pianificare'}</span><button class="btn btn-small btn-soft" data-action="detail" data-id="${attr(p.id)}">Apri →</button></div></div></article>`;}
  function gardenItems(){const q=gardenQuery.trim().toLocaleLowerCase('it');return state.plants.filter(p=>(gardenFilter==='tutte'||p.location===gardenFilter) && [plantName(p),p.species,p.location,p.notes].some(s=>String(s||'').toLocaleLowerCase('it').includes(q)));}
  function renderGarden(){const locs=[...new Set(state.plants.map(p=>p.location).filter(Boolean))].sort();main.innerHTML=header('Il mio giardino','Tutte le tue piante in un unico posto, con fotografie e storico degli interventi.',btn('＋ Nuova pianta','new-plant'))+`<div class="toolbar"><label class="search-field">🔎 <input id="gardenSearch" placeholder="Cerca tra le tue piante..." value="${attr(gardenQuery)}" autocomplete="off" aria-label="Cerca tra le mie piante"></label><select id="gardenFilter" class="filter-select" aria-label="Filtra per ambiente"><option value="tutte">Tutti gli ambienti</option>${locs.map(l=>`<option value="${attr(l)}" ${gardenFilter===l?'selected':''}>${esc(l)}</option>`).join('')}</select></div><div id="gardenResults"></div><p class="footer-note">Consiglio: puoi registrare più esemplari della stessa specie con nomi diversi.</p>`;updateGardenResults();}
  function updateGardenResults(){const items=gardenItems();$('#gardenResults').innerHTML=items.length?`<div class="plant-grid">${items.map(plantCard).join('')}</div>`:empty('🪴',state.plants.length?'Nessuna corrispondenza':'Il giardino ti aspetta',state.plants.length?'Modifica i filtri o la ricerca per ritrovare le tue piante.':'Registra la tua prima pianta: ti aiuteremo a ricordare come prendertene cura.',state.plants.length?'':'new-plant','Aggiungi la prima pianta');}

  function renderCalendar(){const all=tasks(),overdue=all.filter(t=>t.days<0),days=Array.from({length:15},(_,i)=>addDays(dateLocal(),i));const dayCards=days.map((date,i)=>{const items=all.filter(t=>t.date===date);return items.length?`<section class="day-group"><h3>${i===0?'Oggi · ':''}${showDate(date,{weekday:'long',day:'numeric',month:'long'})}</h3><div class="due-list">${items.map(taskRow).join('')}</div></section>`:''}).filter(Boolean).join('');main.innerHTML=header('Calendario delle cure','Controlla le prossime scadenze e registra gli interventi fatti.')+`<div class="alert" style="margin-bottom:20px">Le frequenze sono indicative e non sostituiscono il controllo di terra, luce e stagione. Questa prima versione non invia notifiche quando è chiusa.</div>${recentCareNotice()}${state.plants.length?(overdue?`<div class="section-head"><h2>Da verificare (${overdue.length})</h2></div><div class="due-list">${overdue.map(taskRow).join('')}</div>`:'')+`<div class="section-head"><h2>Prossimi 15 giorni</h2></div><div class="schedule-days">${dayCards||`<div class="panel">Nessuna cura pianificata nei prossimi 15 giorni.</div>`}</div>`:empty('📅','Il calendario è vuoto','Aggiungi una pianta: creeremo le prime scadenze di irrigazione e concimazione.','new-plant','Aggiungi pianta')}`;}

  function catalogItems(){const q=catalogQuery.trim().toLocaleLowerCase('it');return catalog.filter(c=>(catalogFilter==='tutte'||c.tipo===catalogFilter) && [c.nome,c.scientifico,c.descrizione].some(s=>s.toLocaleLowerCase('it').includes(q)));}
  function catalogCard(c){return `<article class="panel ency-card"><div class="ency-head"><div class="ency-emoji">${c.emoji}</div><div><h3>${esc(c.nome)}</h3><div class="latin">${esc(c.scientifico)}</div></div></div>${c.essenziale?`<div class="ency-meta"><span>${esc(c.tipo)}</span><span>Scheda essenziale</span></div>`:`<p class="description">${esc(c.descrizione)}</p><div class="ency-meta"><span>☀ ${esc(c.luce)}</span><span>💧 Stima ${c.acqua} g</span><span>${esc(c.tipo)}</span></div>`}<div class="ency-buttons">${btn('Dettagli','catalog-detail',`data-id="${attr(c.id)}"`,'btn-ghost btn-small')}${btn('＋ Giardino','new-plant',`data-species="${attr(c.id)}"`,'btn-soft btn-small')}</div></article>`;}
  function renderCatalog(){const types=[...new Set(catalog.map(x=>x.tipo))].sort();main.innerHTML=header('Enciclopedia delle piante',`${catalog.length} specie consultabili offline; ricerca mondiale gratuita quando sei online.`)+`<div class="toolbar"><label class="search-field">🔎 <input id="catalogSearch" placeholder="Cerca una pianta..." value="${attr(catalogQuery)}" aria-label="Cerca nel catalogo"></label><select id="catalogFilter" class="filter-select" aria-label="Filtra categoria"><option value="tutte">Tutte le categorie</option>${types.map(t=>`<option ${catalogFilter===t?'selected':''} value="${attr(t)}">${esc(t)}</option>`).join('')}</select></div><div id="catalogResults"></div><section class="online-catalog"><div class="section-head"><h2>🌍 Catalogo mondiale</h2></div><p class="muted tiny">Non trovi una specie? Cerca nei dati tassonomici iNaturalist. Serve Internet; queste schede sono consultabili ma non hanno cure locali verificate.</p><button class="btn btn-soft" data-action="search-world">🔎 Cerca ${esc(catalogQuery||'altre specie')} online</button><div id="onlineResults" aria-live="polite"></div></section><details class="home-more"><summary>Informazioni sulle schede e sicurezza</summary><p>Le ${catalog.length} voci comprendono ${window.CATALOGO_SIMO_EXTRA_COUNT||0} schede essenziali, senza dati colturali o di tossicità verificati. I dati numerici delle schede approfondite sono stime da adattare al vaso, al terreno e alla stagione. Non usare questo catalogo per giudicare la commestibilità.</p></details>`;updateCatalogResults();}
  function updateCatalogResults(){const items=catalogItems(),listed=items.slice(0,catalogShown);$('#catalogResults').innerHTML=`<p class="muted tiny">${items.length} corrispondenze · ${listed.length} visualizzate</p>`+(items.length?`<div class="ency-grid">${listed.map(catalogCard).join('')}</div>${items.length>listed.length?`<button class="btn btn-soft load-more" data-action="more-plants">Mostra altre ${Math.min(24,items.length-listed.length)} specie ↓</button>`:''}`:empty('🔎','Nessuna pianta trovata','Prova con un altro nome o cerca online.'));}
  async function searchWorld(){const target=$('#onlineResults'),q=catalogQuery.trim();if(!target)return;if(q.length<2){target.innerHTML='<div class="alert">Digita almeno due caratteri nella ricerca in alto, poi riprova.</div>';return;}
    target.innerHTML='<p class="muted">Ricerca in corso su iNaturalist…</p>';
    try{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),14000);let response;try{response=await fetch(`https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(q)}&taxon_id=47126&per_page=20&locale=it`,{signal:controller.signal});}finally{clearTimeout(timer)}
      if(!response.ok)throw Error(`Servizio non disponibile (${response.status})`);
      const data=await response.json();const found=(data.results||[]).filter(t=>t?.name&&Number.isFinite(t.id)).slice(0,20);
      target.innerHTML=found.length?`<p class="muted tiny">${data.total_results||found.length} risultati online. Apri iNaturalist per la scheda completa.</p><div class="world-results">${found.map(t=>{const common=t.preferred_common_name||t.name;const latin=t.name;const img=t.default_photo?.medium_url||t.default_photo?.square_url||'';const photo=img.startsWith('https://')?`<img loading="lazy" src="${attr(img)}" alt="Foto botanica di ${attr(latin)}">`:'<span>🌿</span>';return `<article class="world-card">${photo}<div><strong>${esc(common)}</strong><small>${esc(latin)}</small><small>${esc(t.rank||'')} · Fonte: iNaturalist</small>${t.default_photo?.attribution?`<small>${esc(t.default_photo.attribution)}</small>`:''}<div class="world-buttons"><button data-action="recognized-plant" data-name="${attr(common)}" data-scientific="${attr(latin)}" class="btn btn-soft btn-small">＋ Giardino</button><a href="https://www.inaturalist.org/taxa/${t.id}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-small">Fonte ↗</a></div></div></article>`}).join('')}</div>`:'<p class="hint">Nessun risultato. Cerca con il nome scientifico o un termine più breve.</p>';
    }catch(e){target.innerHTML=`<div class="alert">Non riesco a collegarmi al catalogo esterno (${esc(e.message)}). Le ${catalog.length} schede locali restano disponibili.</div>`;}
  }

  function renderOther(){main.innerHTML=header('Altre funzioni','Strumenti utili, senza complicazioni.')+`
    <div class="settings-list">
    <button type="button" class="panel feature-card" data-view="enciclopedia"><span class="feature-icon">📚</span><span><h3>Enciclopedia</h3><p>Trova le specie botaniche</p></span></button>
    <button type="button" class="panel feature-card" data-view="calendario"><span class="feature-icon">📅</span><span><h3>Calendario</h3><p>Scadenze delle cure</p></span></button>
    <button type="button" class="panel feature-card" data-view="sintomi"><span class="feature-icon">🔎</span><span><h3>Guida ai sintomi</h3><p>Controlli e cause possibili</p></span></button>
    <details class="home-more"><summary>⚙️ Dati e backup</summary><p>Esporta periodicamente un backup delle tue piante.</p><div class="home-more-inner">${btn('Esporta backup','export','','btn-primary')}${btn('Importa backup','import','','btn-soft')}</div></details>
    <details class="home-more"><summary>⚠️ Elimina archivio</summary><p>Operazione definitiva: salva prima un backup.</p>${btn('Elimina i dati locali','reset','','btn-danger')}</details>
    </div>`;}
  const symptoms={
    yellow:{name:'Foglie ingiallite',causes:[['Irrigazione','Terriccio costantemente bagnato può ridurre l’ossigeno alle radici; anche la siccità può ingiallire le foglie.'],['Luce e stagione','Verifica esposizione, cambiamenti recenti e normale ricambio di foglie vecchie.'],['Nutrienti e radici','Solo dopo avere valutato acqua e luce, considera fertilità e spazio radicale.']],steps:'Controlla l’umidità del terriccio a qualche centimetro, osserva se il problema riguarda foglie nuove o vecchie e valuta drenaggio e luce.'},
    dry:{name:'Punte secche',causes:[['Acqua e umidità','Siccità, aria secca o irrigazioni irregolari possono seccare punte e margini.'],['Sali e fertilizzante','Accumuli di sali nel substrato possono danneggiare le radici.'],['Esposizione','Sole intenso, correnti o fonti di calore possono essere fattori.']],steps:'Controlla esposizione, umidità del terriccio e fertilizzazioni recenti. Non aggiungere concime solo perché le punte sono secche.'},
    spots:{name:'Macchie sulle foglie',causes:[['Danni ambientali','Bruciature solari e stress termici possono creare macchie.'],['Infezioni','Possibili funghi o batteri, soprattutto con eccesso di umidità; la foto da sola non basta a confermarlo.'],['Parassiti','Controlla il lato inferiore delle foglie e la presenza di piccoli insetti.']],steps:'Isola temporaneamente la pianta se sospetti contagio; fotografa le macchie e monitora se aumentano. Evita trattamenti senza identificazione.'},
    droop:{name:'Foglie afflosciate',causes:[['Terriccio troppo asciutto','La perdita di turgore può dipendere dalla sete.'],['Radici in difficoltà','Anche l’eccesso d’acqua può causare foglie cadenti.'],['Calore o rinvaso','Stress da temperatura o recente spostamento possono incidere.']],steps:'Tocca il terreno e valuta peso del vaso e drenaggio prima di annaffiare. Nota quando il sintomo compare.'},
    insects:{name:'Insetti o tracce di parassiti',causes:[['Afidi','Piccoli insetti raggruppati sui germogli teneri.'],['Cocciniglie','Scudetti o ciuffi cotonosi su foglie e fusti.'],['Acari e altri insetti','Puntinature sottili, ragnatele o altri segni richiedono ispezione ravvicinata.']],steps:'Controlla anche il retro delle foglie e scatta una fotografia nitida dell’organismo. Se possibile separa la pianta dalle altre.'},
    bloom:{name:'La pianta non fiorisce',causes:[['Luce insufficiente','Molte specie fiorite necessitano di un livello minimo di luce.'],['Potatura o periodo sbagliato','Alcune specie fioriscono su rami dell’anno precedente.'],['Stagione, acqua, fertilizzazione','Maturità della pianta e condizioni di crescita influenzano i fiori.']],steps:'Verifica specie, stagione di fioritura e ore di luce prima di aumentare il concime.'}
  };
  function diagnose(){const data=symptoms[$('#symptom').value];const p=state.plants.find(p=>p.id===$('#symptomPlant').value);$('#diagResults').innerHTML=`<div class="hint"><strong>${esc(data.name)}${p?' · '+esc(plantName(p)):''}</strong><br>Le seguenti sono ipotesi da verificare, non un riconoscimento della malattia.</div>${data.causes.map(([title,desc])=>`<div class="panel"><h3>${esc(title)}</h3><p class="muted tiny">${esc(desc)}</p></div>`).join('')}<div class="panel"><h3>Primo controllo consigliato</h3><p>${esc(data.steps)}</p></div>${p?btn('Apri scheda della pianta','detail',`data-id="${attr(p.id)}"`,'btn-soft'):''}`;}

  function showModal(title,body){modalContent.innerHTML=`<div class="sheet-head"><h2>${title}</h2><button class="close-btn" type="button" data-action="close-modal" aria-label="Chiudi">×</button></div><div class="sheet-body">${body}</div>`;if(!modal.open)modal.showModal();}
  function closeModal(){if(modal.open)modal.close();}
  function catalogDetail(id){const c=catalog.find(c=>c.id===id);if(!c)return;showModal(`🌿 ${esc(c.nome)}`,`<p class="muted" style="font-style:italic">${esc(c.scientifico)}</p><p style="margin:13px 0">${esc(c.descrizione)}</p>${c.essenziale?'<div class="alert">Scheda identificativa: cure, luce, irrigazione e tossicità non verificate per questa specie.</div>':''}<div class="info-grid"><div class="info-cell"><small>Esposizione</small><strong>${esc(c.luce)}</strong></div><div class="info-cell"><small>Categoria</small><strong>${esc(c.tipo)}</strong></div><div class="info-cell"><small>Acqua (stima iniziale)</small><strong>${c.essenziale?'Non verificata':c.acqua+' giorni'}</strong></div><div class="info-cell"><small>Concimazione (stima)</small><strong>${c.essenziale?'Non verificata':c.concime+' giorni'}</strong></div></div><h3>Consigli generali</h3><p style="margin:8px 0 13px">${esc(c.cura)}</p><div class="alert"><strong>Attenzione:</strong> ${esc(c.tossica)}</div><p class="form-help" style="margin-top:12px">Le informazioni non sostituiscono l'identificazione botanica certa o le indicazioni di un professionista.</p><div class="form-actions">${btn('＋ Aggiungi al giardino','new-plant',`data-species="${attr(c.id)}"`)}</div>`);}

  window.SIMO_DIAG_PLANTS=()=>state.plants.map(p=>({id:p.id,name:plantName(p)}));
  function careGuideHTML(plant,sp){
    const a=window.SIMO_CARE.advise(plant,sp);
    const line=(title,description)=>`<div class="care-line"><strong>${title}</strong><p>${esc(description)}</p></div>`;
    return `<div class="care-guide">
      ${!a.verified?'<div class="alert">Specie o cure non confermate: sono indicazioni generali.</div>':''}
      ${line('☀️ Luce e collocazione',a.position)}
      ${plant.location?line('📍 Dove si trova',plant.location+(plant.light?' · '+plant.light:'')):''}
      ${line('💧 Quantità d’acqua',a.amount)}
      ${line('🪴 Quando bagnare',a.moisture)}
      ${line('🌱 Terriccio',plant.soilType?plant.soilType+' · '+a.soil:a.soil)}
      ${line('🚰 Drenaggio',a.drainage)}
      ${line('🌾 Concimazione',a.fertilizer)}
      ${line('⚠️ Bambini e animali',a.toxicity)}
    </div>`;
  }
  function formField(label,id,body,full=false){return `<div class="form-field ${full?'full':''}"><label for="${id}">${label}</label>${body}</div>`;}
  function plantForm(id='',prefill=''){const p=state.plants.find(p=>p.id===id);const sp=p?species(p):catalog.find(c=>c.id===prefill);const n=p||{};const val=(key,fallback='')=>attr(n[key]??fallback);const currentId=n.catalogId||prefill||'';
    const body=`<form id="plantForm" novalidate><input type="hidden" name="id" value="${attr(id)}"><div class="form-grid">
      ${formField('Nome personalizzato *','pname',`<input id="pname" name="nickname" required maxlength="80" placeholder="Es. Ortensia del balcone" value="${val('nickname',sp?.nome||'')}">`,true)}
      ${formField('Specie dal catalogo','pspecies',`<select id="pspecies" name="catalogId"><option value="">Altra specie / non so</option>${catalog.map(c=>`<option value="${attr(c.id)}" ${currentId===c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}</select>`)}
      ${formField('Specie libera','pcustom',`<input id="pcustom" name="species" maxlength="120" value="${val('species',sp?.nome||'')}" placeholder="Nome pianta (se conosciuto)">`)}
      ${formField('Dove si trova?','plocation',`<input id="plocation" name="location" maxlength="70" value="${val('location',defaultLocation)}" placeholder="Balcone, cucina, terrazzo...">`)}
      ${formField('Esposizione','plight',`<select id="plight" name="light">${['Da verificare','Sole','Sole filtrato','Mezz’ombra','Ombra','Luce indiretta'].map(x=>`<option ${((n.light||sp?.luce||'Da verificare')===x)?'selected':''}>${x}</option>`).join('')}</select>`)}
      ${formField('Intervallo acqua (giorni)','pwater',`<input id="pwater" name="waterInterval" type="number" min="0" max="365" value="${val('waterInterval',sp ? sp.acqua : 0)}" required>`)}
      ${formField('Intervallo concime (giorni)','pfeed',`<input id="pfeed" name="feedInterval" type="number" min="0" max="365" value="${val('feedInterval',sp ? sp.concime : 0)}" required>`)}
      ${formField('Ultima annaffiatura','plastwater',`<input id="plastwater" name="lastWater" type="date" value="${val('lastWater')}">`)}
      ${formField('Ultima concimazione','plastfeed',`<input id="plastfeed" name="lastFeed" type="date" value="${val('lastFeed')}">`)}
      ${formField('Fotografia della pianta','pphoto',`<input id="pphoto" name="photo" type="file" accept="image/*"><span class="form-help">Foto ridotta automaticamente per risparmiare spazio sul dispositivo.</span>${hasPhoto(n)?`<img id="photoPreview" class="image-preview" src="${attr(n.photo)}" alt="Anteprima della fotografia">`:'<img id="photoPreview" class="image-preview" style="display:none" alt="Anteprima della fotografia">'}`,true)}
      ${formField('Note personali','pnotes',`<textarea id="pnotes" name="notes" maxlength="3000" placeholder="Informazioni utili, colore dei fiori, preferenze...">${esc(n.notes||'')}</textarea>`,true)}
    </div><p class="hint" style="margin-top:16px">Gli intervalli sono promemoria orientativi, modificabili. Controlla sempre il terriccio prima di annaffiare.</p><div class="form-actions">${btn('Annulla','close-modal','','btn-ghost')}<button type="submit" class="btn btn-primary">${p?'Salva modifiche':'Aggiungi al giardino'}</button></div></form>`;
    showModal(p?'Modifica la tua pianta':'Aggiungi una pianta',body);
    if(p)$('#plantForm').dataset.oldPhoto=p.photo||'';
  }
  function compressPhoto(file){return new Promise((resolve,reject)=>{if(!file)return resolve(null);if(!file.type.startsWith('image/'))return reject(new Error('Scegli un file immagine.'));if(file.size>25*1024*1024)return reject(new Error('La fotografia supera 25 MB.'));const img=new Image();const url=URL.createObjectURL(file);img.onload=()=>{try{const max=1000,ratio=Math.min(1,max/img.width,max/img.height);const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*ratio));canvas.height=Math.max(1,Math.round(img.height*ratio));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);resolve(canvas.toDataURL('image/jpeg',.78));}catch(e){URL.revokeObjectURL(url);reject(e)}};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Immagine non leggibile.'))};img.src=url;});}
  async function submitPlant(form){const f=new FormData(form);const id=String(f.get('id')||'');const previous=state.plants.find(p=>p.id===id);const nickname=String(f.get('nickname')||'').trim();if(!nickname){toast('Inserisci il nome della pianta.');$('#pname').focus();return;}
    const waterInterval=Number(f.get('waterInterval')),feedInterval=Number(f.get('feedInterval'));
    if(![waterInterval,feedInterval].every(n=>Number.isInteger(n)&&n>=0&&n<=365)){toast('Gli intervalli devono essere tra 0 e 365 giorni (0 = nessun promemoria).');return;}
    const file=$('#pphoto').files[0];let photo=previous?.photo||window.SIMO_ID?.pendingPhoto||'';if(file){try{photo=await compressPhoto(file)}catch(e){toast(e.message);return;}}
    const entry={id:id||uid(),catalogId:String(f.get('catalogId')||''),nickname,species:String(f.get('species')||'').trim(),location:String(f.get('location')||'').trim(),light:String(f.get('light')||''),waterInterval,feedInterval,lastWater:String(f.get('lastWater')||''),lastFeed:String(f.get('lastFeed')||''),photo,notes:String(f.get('notes')||'').trim(),createdOn:previous?.createdOn||dateLocal()};
    const oldPlants=state.plants.slice();if(previous)state.plants=state.plants.map(p=>p.id===id?entry:p);else state.plants.push(entry);
    try{await save();closeModal();render();if(window.SIMO_ID)window.SIMO_ID.pendingPhoto='';toast(previous?'Pianta aggiornata.':'Pianta aggiunta al giardino!');}catch(e){state.plants=oldPlants;errorToast(e);}
  }
  function plantDetail(id){const p=state.plants.find(p=>p.id===id);if(!p)return;const sp=species(p);const history=state.events.filter(e=>e.plantId===id).slice().sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||'').localeCompare(a.createdAt||''));const waterDue=nextDate(p,'water'),feedDue=nextDate(p,'feed');showModal(esc(plantName(p)),`
    <div class="plant-profile-head">${photoOrEmoji(p,'profile-avatar')}<div><strong>${esc(p.species||sp?.nome||'Specie non indicata')}</strong><p class="muted tiny">📍 ${esc(p.location||'Posizione non indicata')} · ☀ ${esc(p.light||'Da verificare')}</p></div></div>
    <div class="info-grid"><div class="info-cell"><small>💧 Prossima irrigazione (stima)</small><strong>${showDate(waterDue)}</strong></div><div class="info-cell"><small>🌱 Prossimo concime (stima)</small><strong>${showDate(feedDue)}</strong></div><div class="info-cell"><small>Intervallo acqua</small><strong>${Number(p.waterInterval)} giorni</strong></div><div class="info-cell"><small>Intervallo concime</small><strong>${Number(p.feedInterval)} giorni</strong></div></div>
    ${p.notes?`<h3>Le tue note</h3><p style="margin-top:8px">${esc(p.notes)}</p>`:''}
    ${sp?`<div class="hint" style="margin:14px 0"><strong>Consiglio per ${esc(sp.nome)}:</strong> ${esc(sp.cura)}</div>`:''}
    <div class="profile-actions">${btn('💧 Ho annaffiato','do-task',`data-id="${attr(p.id)}" data-type="water"`,'btn-soft')}${btn('🌱 Ho concimato','do-task',`data-id="${attr(p.id)}" data-type="feed"`,'btn-soft')}${btn('＋ Nota / intervento','new-event',`data-id="${attr(p.id)}"`,'btn-ghost')}</div>
    ${recentCareNotice()}
    <div class="section-head"><h3>Diario della pianta</h3>${btn('Modifica','edit-plant',`data-id="${attr(p.id)}"`,'btn-ghost btn-small')}</div>
    ${history.length?`<div class="timeline">${history.slice(0,40).map(e=>`<div class="timeline-item"><time>${showDate(e.date,{day:'numeric',month:'long',year:'numeric'})}</time><strong>${({water:'💧 Annaffiatura',feed:'🌱 Concimazione',prune:'✂️ Potatura',repot:'🪴 Rinvaso',note:'📝 Nota'})[e.type]||'Intervento'}</strong>${['water','feed'].includes(e.type)?`<button type="button" class="care-remove-btn" data-action="undo-care" data-event-id="${attr(e.id)}" aria-label="Elimina questa registrazione di ${e.type==='water'?'annaffiatura':'concimazione'}" title="Elimina registrazione errata">×</button>`:''}${e.text?`<p class="muted tiny">${esc(e.text)}</p>`:''}</div>`).join('')}</div>`:'<p class="muted tiny">Nessun intervento registrato. Le tue cure appariranno qui.</p>'}
    <div class="form-actions" style="margin-top:24px">${btn('Elimina pianta','delete-plant',`data-id="${attr(p.id)}"`,'btn-danger btn-small')}</div>`);
  }
  async function addEvent(id,type,text=''){
    const p=state.plants.find(p=>p.id===id);
    if(!p||careSaving)return;
    careSaving=true;
    const before=structuredClone(state),beforeRecent=lastCareEventId,date=dateLocal();
    const isCare=type==='water'||type==='feed';
    const field=type==='water'?'lastWater':'lastFeed';
    const prevCare=isCare?state.events.filter(e=>e.plantId===id&&e.type===type).at(-1):null;
    const item={id:uid(),plantId:id,type,date,createdAt:new Date().toISOString(),text};
    if(isCare){item.previousDate=p[field]||'';item.previousEventId=prevCare?.id||'';}
    state.events.push(item);
    if(isCare)p[field]=date;
    try{
      await save();
      lastCareEventId=isCare?item.id:'';
      if(modal.open)plantDetail(id);else render();
      if(isCare)toastUndo(type==='water'?'Annaffiatura registrata.':'Concimazione registrata.',item.id);
      else toast('Intervento salvato.');
    }catch(err){state=before;lastCareEventId=beforeRecent;errorToast(err);}
    finally{careSaving=false;}
  }
  async function undoCareEvent(eventId){
    if(careSaving)return;
    const record=state.events.find(e=>e.id===eventId);
    if(!record||!['water','feed'].includes(record.type)){
      toast('Intervento già rimosso.');return;
    }
    const p=state.plants.find(p=>p.id===record.plantId);
    if(!p)return;
    if(eventId!==lastCareEventId&&!confirm('Eliminare questa registrazione di '+(record.type==='water'?'annaffiatura':'concimazione')+' del '+showDate(record.date)+'?'))return;
    careSaving=true;
    const before=structuredClone(state),beforeRecent=lastCareEventId;
    const field=record.type==='water'?'lastWater':'lastFeed';
    const sameType=state.events.filter(e=>e.plantId===record.plantId&&e.type===record.type);
    const wasLatest=sameType.at(-1)?.id===record.id;
    // Relink the undo chain if the user removes an older entry first.
    for(const next of sameType){
      if(next.previousEventId!==record.id)continue;
      next.previousEventId=record.previousEventId||'';
      if(next.previousDate===record.date)next.previousDate=record.previousDate||'';
    }
    state.events=state.events.filter(e=>e.id!==record.id);
    // Respect any manual correction made in the plant editor after this registration.
    if(wasLatest&&p[field]===record.date){
      p[field]=typeof record.previousDate==='string'?record.previousDate:
        (state.events.filter(e=>e.plantId===record.plantId&&e.type===record.type).at(-1)?.date||'');
    }
    try{
      await save();
      if(eventId===lastCareEventId)lastCareEventId='';
      if(modal.open)plantDetail(p.id);else render();
      toast('Registrazione annullata. Scadenze aggiornate.');
    }catch(err){state=before;lastCareEventId=beforeRecent;errorToast(err);}
    finally{careSaving=false;}
  }
  function eventForm(id){const p=state.plants.find(p=>p.id===id);if(!p)return;showModal('Nuova nota o intervento',`<form id="eventForm" data-id="${attr(id)}" class="form-grid"><div class="form-field full"><label for="eventType">Tipo di intervento</label><select id="eventType" name="type"><option value="note">📝 Nota</option><option value="prune">✂️ Potatura</option><option value="repot">🪴 Rinvaso</option></select></div><div class="form-field full"><label for="eventText">Descrizione</label><textarea name="text" id="eventText" maxlength="1500" required placeholder="Che cosa hai notato o fatto?"></textarea></div><div class="form-actions full">${btn('Annulla','close-modal','','btn-ghost')}<button class="btn btn-primary" type="submit">Registra intervento</button></div></form>`);}
  async function deletePlant(id){const p=state.plants.find(p=>p.id===id);if(!p)return;if(!confirm(`Eliminare "${plantName(p)}" e tutto il suo diario?`))return;const prev=structuredClone(state);state.plants=state.plants.filter(p=>p.id!==id);state.events=state.events.filter(e=>e.plantId!==id);if(!state.events.some(e=>e.id===lastCareEventId))lastCareEventId='';try{await save();closeModal();render();toast('Pianta eliminata.');}catch(e){state=prev;errorToast(e);}}
  function exportFile(){const payload={app:'I FIORI della SIMO',version:'0.2.0',exportedAt:new Date().toISOString(),data:state};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`i-fiori-della-simo-backup-${dateLocal()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('Backup pronto da salvare.');}
  async function importFile(file){if(!file)return;if(file.size>60*1024*1024){toast('Il file supera 60 MB.');return;}try{const payload=JSON.parse(await file.text());if(payload.app!=='I FIORI della SIMO'||payload.data?.schema!==1||!Array.isArray(payload.data.plants)||!Array.isArray(payload.data.events))throw new Error('Formato non compatibile.');for(const p of payload.data.plants){if(typeof p.id!=='string'||typeof p.nickname!=='string'||(p.photo&& !/^data:image\/(jpeg|png|webp);base64,/i.test(p.photo)))throw new Error('Una scheda del backup non è valida.');}if(!confirm(`Importare ${payload.data.plants.length} piante e ${payload.data.events.length} registrazioni? I dati attuali saranno sostituiti.`))return;const prior=state;state=payload.data;lastCareEventId='';try{await save();render();toast('Backup ripristinato correttamente.');}catch(e){state=prior;errorToast(e);}}catch(e){toast(`Importazione non riuscita: ${e.message}`);}finally{$('#restoreInput').value='';}}
  async function resetAll(){if(!confirm('Eliminare definitivamente tutte le piante e il diario di questo dispositivo?'))return;if(!confirm('Ultima conferma: hai esportato un backup?'))return;const prev=state;state=blankState();lastCareEventId='';try{await save();setView('oggi');toast('Archivio locale azzerato.')}catch(e){state=prev;errorToast(e);}}

  document.addEventListener('click',async e=>{const el=e.target.closest('[data-action],[data-view]');if(!el)return;if(el.dataset.view){setView(el.dataset.view);return;}const action=el.dataset.action, id=el.dataset.id;try{switch(action){case 'new-plant':if(window.SIMO_ID)window.SIMO_ID.pendingPhoto='';plantForm('',el.dataset.species||'');break;case 'recognized-plant':plantForm('',el.dataset.catalogId||'');$('#pname').value=el.dataset.name||el.dataset.scientific||'';$('#pcustom').value=el.dataset.scientific||el.dataset.name||'';if(window.SIMO_ID)window.SIMO_ID.pendingPhoto=el.dataset.fromScan==='1'?(window.SIMO_ID.getPhoto()||''):'';break;case 'more-plants':catalogShown+=24;updateCatalogResults();break;case 'search-world':await searchWorld();break;case 'edit-plant':plantForm(id);break;case 'detail':plantDetail(id);break;case 'catalog-detail':catalogDetail(id);break;case 'close-modal':closeModal();break;case 'do-task':await addEvent(id,el.dataset.type);break;case 'undo-care':await undoCareEvent(el.dataset.eventId);break;case 'new-event':eventForm(id);break;case 'delete-plant':await deletePlant(id);break;case 'calendar':setView('calendario');break;case 'diagnosi':setView('diagnosi');break;case 'diagnose':diagnose();break;case 'save-diagnosis':{
    const pid=window.SIMO_DIAG?.getChosenPlant?.(),text=window.SIMO_DIAG?.noteText?.();
    if(!pid){toast('Seleziona una pianta del tuo giardino.');break;}
    if(!text){toast('Prima completa una diagnosi fotografica.');break;}
    await addEvent(pid,'note',text);break;
  }case 'export':exportFile();break;case 'import':$('#restoreInput').click();break;case 'reset':await resetAll();break;}}catch(err){console.error(err);toast('Si è verificato un errore. Riprova.');}});
  $('#brandHome').addEventListener('click',()=>setView('oggi'));
  $('#restoreInput').addEventListener('change',e=>importFile(e.target.files[0]));
  modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
  document.addEventListener('submit',async e=>{if(e.target.matches('#plantForm')){e.preventDefault();await submitPlant(e.target);}else if(e.target.matches('#eventForm')){e.preventDefault();const id=e.target.dataset.id,type=e.target.querySelector('[name=type]').value,text=e.target.querySelector('[name=text]').value.trim();if(!text){toast('Descrivi l’intervento.');return;}await addEvent(id,type,text);}});
  document.addEventListener('input',e=>{if(e.target.id==='gardenSearch'){gardenQuery=e.target.value;updateGardenResults();}if(e.target.id==='catalogSearch'){catalogQuery=e.target.value;catalogShown=24;updateCatalogResults();}if(e.target.id==='pphoto'){const file=e.target.files?.[0];if(file){const preview=$('#photoPreview');if(preview){preview.src=URL.createObjectURL(file);preview.style.display='block';}}}});
  document.addEventListener('change',e=>{if(e.target.id==='gardenFilter'){gardenFilter=e.target.value;updateGardenResults();}if(e.target.id==='catalogFilter'){catalogFilter=e.target.value;catalogShown=24;updateCatalogResults();}if(e.target.id==='pspecies'){const c=catalog.find(x=>x.id===e.target.value);if(c){$('#pcustom').value=c.nome;$('#plight').value=c.luce;$('#pwater').value=c.acqua;$('#pfeed').value=c.concime;}}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!modal.open)render();});
  async function init(){try{db=await openDb();await load();render();if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'))navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('Offline SW non disponibile:',e));}catch(e){console.error(e);main.innerHTML=`<div class="panel"><h2>Archivio locale non accessibile</h2><p>Consenti al browser di conservare i dati per questo sito, quindi ricarica la pagina. ${esc(e.message)}</p></div>`;}}
  init();
})();
