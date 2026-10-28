'use strict';
(function simoCalendarPlus() {
  const STORAGE = 'ifiori-calendar-preferences-v1';
  const NOTICE = 'ifiori-calendar-notified-v1';
  let prefs = { mode:'month', anchor:'', selected:'' };
  let getState = () => ({plants:[],reminders:[]});
  let ctx = null;
  let started = false;
  const q = sel => document.querySelector(sel);
  const esc = v => String(v??'').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const iso = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const fromISO = s => { const [y,m,d]=String(s).split('-').map(Number); return new Date(y,m-1,d,12); };
  const addDays = (s, n) => { const d=fromISO(s);d.setDate(d.getDate()+n);return iso(d); };
  const diff = (a,b) => Math.round((fromISO(a)-fromISO(b))/86400000);
  const number = p => Number(p.calendarNumber)||((getState().plants||[]).indexOf(p)+1);
  const label = p => p.nickname||p.species||'Pianta';
  const titleFor = t => t.type==='water'?'Irrigazione':t.type==='feed'?'Concimazione':t.title||'Attività';
  const markFor = t => t.type==='water'?'💧':t.type==='feed'?'🌱':'🔔';
  const today = () => iso();
  function restore(){
    try {const p=JSON.parse(localStorage.getItem(STORAGE)||'{}');if(['week','month'].includes(p.mode))prefs.mode=p.mode;if(/^\d{4}-\d{2}-\d{2}$/.test(p.anchor||''))prefs.anchor=p.anchor;if(/^\d{4}-\d{2}-\d{2}$/.test(p.selected||''))prefs.selected=p.selected;} catch {}
    prefs.anchor ||= today();prefs.selected ||= today();
  }
  function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(prefs));}catch{}}
  function beginOfWeek(s){return addDays(s,-((fromISO(s).getDay()+6)%7));}
  function monthSpan(s){const d=fromISO(s);const begin=iso(new Date(d.getFullYear(),d.getMonth(),1,12));const end=iso(new Date(d.getFullYear(),d.getMonth()+1,0,12));return {start:begin,end};}
  function visibleSpan(){if(prefs.mode==='week'){const start=beginOfWeek(prefs.anchor);return {start,end:addDays(start,6),gridStart:start,gridDays:7};}
    const {start,end}=monthSpan(prefs.anchor);const gridStart=beginOfWeek(start);const gridDays=Math.ceil((diff(end,gridStart)+1)/7)*7;return {start,end,gridStart,gridDays};
  }
  function collect(start,end){
    const data=getState(),current=today(),byDay=new Map(),overdue=[];
    const put=item=>{if(item.date>=start&&item.date<=end){const group=byDay.get(item.date)||[];group.push(item);byDay.set(item.date,group);}};
    for(const p of data.plants||[]){
      for(const type of ['water','feed']){
        const interval=Number(type==='water'?p.waterInterval:p.feedInterval);
        if(!Number.isInteger(interval)||interval<1)continue;
        const last=(type==='water'?p.lastWater:p.lastFeed)||p.createdOn||current;
        if(!/^\d{4}-\d\d-\d\d$/.test(last))continue;
        let due=addDays(last,interval);
        const task={p,type,number:number(p),title:titleFor({type})};
        if(due<current){overdue.push({...task,date:due,overdue:true});continue;}
        if(due<start){due=addDays(due,Math.max(0,Math.ceil(diff(start,due)/interval))*interval);}
        for(let count=0;due<=end&&count<370;count++,due=addDays(due,interval))put({...task,date:due,predicted:count>0});
      }
    }
    for(const r of data.reminders||[]){
      const p=(data.plants||[]).find(x=>x.id===r.plantId);
      if(!p||!/^\d{4}-\d\d-\d\d$/.test(r.date||''))continue;
      const interval=Number(r.repeatDays)||0,completed=new Set(r.doneDates||[]);
      const make=day=>({p,type:'custom',id:r.id,title:r.title||'Attività',date:day,number:number(p),custom:true});
      if(interval>0){
        let due=r.date; let late=null;
        if(due<start){due=addDays(due,Math.max(0,Math.ceil(diff(start,due)/interval))*interval);}
        // Indicate the latest overdue occurrence without generating years of history.
        if(r.date<current){
          const prevCount=Math.floor((diff(addDays(current,-1),r.date))/interval);
          const prev=addDays(r.date,Math.max(0,prevCount)*interval);
          if(prev<current&&!completed.has(prev))late=prev;
        }
        if(late)overdue.push({...make(late),overdue:true});
        for(let i=0;due<=end&&i<370;i++,due=addDays(due,interval)){
          if(due>=current&&!completed.has(due))put(make(due));
        }
      } else if(!completed.has(r.date)){
        if(r.date<current)overdue.push({...make(r.date),overdue:true});
        else put(make(r.date));
      }
    }
    for(const list of byDay.values())list.sort((a,b)=>a.number-b.number || a.type.localeCompare(b.type));
    return {byDay,overdue:overdue.sort((a,b)=>a.date.localeCompare(b.date)||a.number-b.number)};
  }
  function format(s,options={day:'numeric',month:'long',year:'numeric'}) {return fromISO(s).toLocaleDateString('it-IT',options);}
  function compact(task){return `<span class="simo-chip ${task.type}" title="${esc('#'+task.number+' '+label(task.p)+' · '+titleFor(task))}">${task.number}${markFor(task)}</span>`;}
  function calendarCells(span,records){
    const weekdays=['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
    let html=`<div class="simo-weekdays">${weekdays.map(d=>`<span>${d}</span>`).join('')}</div><div class="simo-days" role="grid" aria-label="Scadenze delle piante">`;
    for(let n=0;n<span.gridDays;n++){
      const date=addDays(span.gridStart,n),items=records.byDay.get(date)||[],active=date===prefs.selected,dim=prefs.mode==='month'&&(date<span.start||date>span.end);
      html+=`<button type="button" class="simo-day ${active?'selected':''} ${dim?'outside':''} ${date===today()?'current':''}" data-cal="pick" data-date="${date}" aria-label="${esc(format(date)+': '+items.length+' attività')}" aria-pressed="${active}">
        <span class="simo-day-num">${Number(date.slice(-2))}</span><span class="simo-day-items">${items.slice(0,4).map(compact).join('')}${items.length>4?`<span class="simo-more">+${items.length-4}</span>`:''}</span></button>`;
    }
    return html+'</div>';
  }
  function line(item){const when=titleFor(item),custom=item.type==='custom',detail=`#${item.number} ${label(item.p)}`;
    return `<div class="simo-task">
       <div class="simo-task-number">#${item.number}</div>
       <div class="simo-task-body"><strong>${esc(label(item.p))}</strong><small>${markFor(item)} ${esc(when)}${item.overdue?' · In ritardo dal '+esc(format(item.date)):''}</small></div>
       <div class="simo-task-controls">${item.date>today()?'<span class="muted tiny">In programma</span>':`<button type="button" class="btn btn-small btn-soft" data-cal="done" data-pid="${esc(item.p.id)}" data-type="${esc(item.type)}" data-reminder="${esc(item.id||'')}" data-date="${esc(item.date)}">Fatto ✓</button>`}${custom?`<button type="button" class="simo-delete" data-cal="delete" data-reminder="${esc(item.id)}" aria-label="Elimina ${esc(when)} per ${esc(detail)}">×</button>`:''}</div>
     </div>`;
  }
  function refreshPanel(){
    const node=q('#simo-day-details'); if(!node)return;
    const span=visibleSpan(),rec=collect(span.gridStart,addDays(span.gridStart,span.gridDays-1));
    const items=rec.byDay.get(prefs.selected)||[];
    node.innerHTML=`<h3>${esc(format(prefs.selected,{weekday:'long',day:'numeric',month:'long'}))} <span class="simo-count">${items.length} attività</span></h3>
      ${items.length?items.map(line).join(''):`<p class="muted">Nessuna attività prevista in questo giorno.</p>`}`;
  }
  function render(main,context){
    ctx=context; if(!prefs.anchor)restore();const span=visibleSpan(),rec=collect(span.gridStart,addDays(span.gridStart,span.gridDays-1)),data=getState();
    if(prefs.selected<span.gridStart||prefs.selected>addDays(span.gridStart,span.gridDays-1))prefs.selected=span.start;
    const title=prefs.mode==='month'?format(span.start,{month:'long',year:'numeric'}):format(span.start,{day:'numeric',month:'short'})+' – '+format(span.end,{day:'numeric',month:'short',year:'numeric'});
    const total=[...rec.byDay.values()].reduce((n,x)=>n+x.length,0);
    main.innerHTML=context.header('Calendario delle cure','Panoramica di tutte le piante: scegli il giorno per vedere nomi e attività.')+`
    <div class="simo-calendar">
      <div class="simo-toolbar">
        <div class="simo-toggle" role="group" aria-label="Visualizzazione calendario"><button data-cal="mode" data-mode="week" class="${prefs.mode==='week'?'on':''}">Settimana</button><button data-cal="mode" data-mode="month" class="${prefs.mode==='month'?'on':''}">Mese</button></div>
        <button class="btn btn-small btn-soft" data-cal="today">Oggi</button>
      </div>
      <div class="simo-nav"><button data-cal="previous" aria-label="Periodo precedente">‹</button><strong>${esc(title)}</strong><button data-cal="next" aria-label="Periodo successivo">›</button></div>
      <p class="simo-calendar-summary">${total} attività previste nel periodo · ${data.plants.length} piante · 🕗 Avvisi alle 20:00<br>💧 Acqua · 🌱 Concime · 🔔 Altre cure</p>
      ${calendarCells(span,rec)}
      <div class="simo-day-detail" id="simo-day-details"></div>
      ${rec.overdue.length?`<details class="simo-drawer"><summary>⚠️ ${rec.overdue.length} attività scadute da verificare</summary>${rec.overdue.map(line).join('')}</details>`:''}
      <details class="simo-drawer"><summary>🔢 Legenda delle piante (${data.plants.length})</summary><div class="simo-legend">${(data.plants||[]).slice().sort((a,b)=>number(a)-number(b)).map(p=>`<div><b>#${number(p)}</b><span>${esc(label(p))}</span><small>${esc(p.location||'')}</small></div>`).join('')||'<p>Non hai ancora inserito piante.</p>'}</div></details>
      <details class="simo-drawer"><summary>➕ Programma un’altra attività</summary>
        <form id="simo-reminder-form" class="simo-form"><label>Pianta<select name="plantId" required>${data.plants.map(p=>`<option value="${esc(p.id)}">#${number(p)} · ${esc(label(p))}</option>`).join('')}</select></label>
        <label>Attività<input name="title" maxlength="90" required placeholder="Es. Potatura, rinvaso, trattamento"></label>
        <label>Data<input name="date" type="date" min="${today()}" value="${prefs.selected>=today()?prefs.selected:today()}" required></label>
        <label>Ripeti ogni (giorni; 0 = una volta)<input name="repeatDays" type="number" min="0" max="365" value="0"></label>
        <button type="submit" class="btn btn-primary" ${data.plants.length?'':'disabled'}>Aggiungi attività</button></form>
      </details>
      <details class="simo-drawer" open><summary>🔔 Promemoria alle 20:00</summary>
        <p>Per ricevere avvisi alle <strong>20:00 anche con l’app chiusa</strong>, scarica gli eventi dei prossimi 90 giorni e importali nel calendario del telefono, attivando gli avvisi per quel calendario.</p>
        <p class="muted tiny">L’esportazione è una fotografia delle scadenze attuali: se aggiungi piante o segni una cura come fatta, aggiorna anche gli eventi importati. Su Google Calendar l’importazione del file ICS si effettua normalmente dal sito desktop. Se importi più volte potresti creare duplicati.</p>
        <div class="simo-buttons"><button type="button" class="btn btn-primary" data-cal="export" ${data.plants.length?'':'disabled'}>📅 Esporta avvisi delle 20:00</button><button type="button" class="btn btn-soft" data-cal="enable">Consenti avvisi app aperta</button><button type="button" class="btn btn-small btn-ghost" data-cal="test">Notifica di prova</button></div>
        <p class="muted tiny">Le notifiche dirette della PWA funzionano soltanto quando l’app è in esecuzione. Non possono essere garantite alle 20 con l’app chiusa senza un servizio push esterno.</p>
      </details>
      <p class="muted tiny">Le scadenze ricorrenti sono stime basate sugli intervalli che hai impostato. Verifica sempre terreno, luce e stagione prima di annaffiare o concimare.</p>
    </div>`;
    refreshPanel();persist();
  }
  function downloadICS(){
    const start=today(),end=addDays(start,89),rec=collect(start,end); const pad=n=>String(n).padStart(2,'0');
    const escaping=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
    const stamp=d=>d.replaceAll('-',''),now=new Date();
    const created=now.getUTCFullYear()+pad(now.getUTCMonth()+1)+pad(now.getUTCDate())+'T'+pad(now.getUTCHours())+pad(now.getUTCMinutes())+pad(now.getUTCSeconds())+'Z';
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//I FIORI della SIMO//Calendario cure//IT','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:I FIORI della SIMO - Cure','X-WR-TIMEZONE:Europe/Rome'];
    let count=0;
    for(let n=0;n<90;n++){
      const day=addDays(start,n),list=rec.byDay.get(day)||[];if(!list.length)continue;
      const body=list.map(t=>`#${t.number} ${label(t.p)}: ${titleFor(t)}`).join('\n');
      lines.push('BEGIN:VEVENT',
        `UID:ifiori-${stamp(day)}@calendar.local`, `DTSTAMP:${created}`,
        `DTSTART:${stamp(day)}T200000`, `DTEND:${stamp(day)}T201000`,
        `SUMMARY:${escaping('🌿 Cura delle piante ('+list.length+')')}`,
        `DESCRIPTION:${escaping(body+'\nConsulta I FIORI della SIMO per le scadenze aggiornate.')}`,
        'BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:PT0M',`DESCRIPTION:${escaping('I FIORI della SIMO: '+body)}`,'END:VALARM','END:VEVENT');
      count++;
    }
    if(!count){ctx?.toast?.('Non ci sono scadenze da esportare nei prossimi 90 giorni.');return;}
    // Fold lines at 70 UTF-16 chars to keep iCalendar readable; avoid CRLF in content.
    const wrapped=lines.map(l=>l.length<72?l:(l.match(/.{1,70}/g)||[]).join('\r\n ')).join('\r\n')+'\r\nEND:VCALENDAR\r\n';
    const url=URL.createObjectURL(new Blob([wrapped],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');
    a.href=url;a.download=`i-fiori-della-simo-cure-20-${start}.ics`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
    ctx?.toast?.(`Calendario pronto: ${count} giorni con avvisi alle 20:00.`);
  }
  async function notifyNow(message,title='I FIORI della SIMO'){
    if(!('Notification' in window)||Notification.permission!=='granted')return false;
    try {
      const reg=await navigator.serviceWorker.ready;
      await reg.showNotification(title,{body:message,icon:'./icons/icon-192-v041.png',tag:'simo-cure-'+today(),renotify:false});
      return true;
    }catch(err){console.warn('Notifica non disponibile',err);return false;}
  }
  async function checkAlerts(){
    try{
      if(localStorage.getItem(STORAGE+'-enabled')!=='1'||!('Notification' in window)||Notification.permission!=='granted')return;
      const now=new Date();if(now.getHours()!==20)return;
      const date=today();if(localStorage.getItem(NOTICE)===date)return;
      const items=collect(date,date).byDay.get(date)||[];if(!items.length)return;
      const body=items.slice(0,8).map(t=>`#${t.number} ${label(t.p)}: ${titleFor(t)}`).join(' · ')+(items.length>8?` · e altre ${items.length-8}`:'');
      const done=await notifyNow(body,`🌿 ${items.length} cure delle piante oggi`);
      if(done)localStorage.setItem(NOTICE,date);
    }catch(e){console.warn('Controllo promemoria',e);}
  }
  async function allowAlerts(){
    if(!('Notification' in window)||!('serviceWorker' in navigator)){ctx?.toast?.('Notifiche non supportate: usa il calendario del telefono.');return;}
    let result=Notification.permission;
    if(result==='default')result=await Notification.requestPermission();
    if(result!=='granted'){ctx?.toast?.('Autorizzazione non concessa. Puoi usare gli avvisi del calendario.');return;}
    try{localStorage.setItem(STORAGE+'-enabled','1');}catch{}
    ctx?.toast?.('Notifiche consentite mentre l’app è in esecuzione.');
    checkAlerts();
  }
  function move(direction){
    if(prefs.mode==='week'){prefs.anchor=addDays(prefs.anchor,7*direction);}
    else {const d=fromISO(prefs.anchor);prefs.anchor=iso(new Date(d.getFullYear(),d.getMonth()+direction,1,12));}
    prefs.selected=prefs.mode==='week'?beginOfWeek(prefs.anchor):monthSpan(prefs.anchor).start;
  }
  function boot(stateGetter){
    getState=stateGetter;restore();if(started)return;started=true;
    document.addEventListener('click',async e=>{
      const btn=e.target.closest('[data-cal]');if(!btn)return;
      e.preventDefault();const action=btn.dataset.cal;
      if(action==='export'){downloadICS();return;}
      if(action==='enable'){await allowAlerts();return;}
      if(action==='test'){
        if('Notification' in window && Notification.permission==='granted'){
          const sent=await notifyNow('Questo è un messaggio di prova. Le tue cure saranno indicate alle 20:00 quando l’app è aperta.','🌿 Notifica di prova');
          ctx?.toast?.(sent?'Notifica di prova inviata.':'Notifica non disponibile: prova il calendario.');
        }else ctx?.toast?.('Prima tocca “Consenti avvisi app aperta”.');
        return;
      }
      if(action==='done'){
        try{
          if(btn.dataset.type==='custom')await ctx?.completeReminder?.(btn.dataset.reminder,btn.dataset.date);
          else await ctx?.completeCare?.(btn.dataset.pid,btn.dataset.type);
        }catch(err){console.error(err);ctx?.toast?.('Impossibile registrare la cura.');}
        return;
      }
      if(action==='delete'){if(confirm('Eliminare questa attività programmata?'))await ctx?.deleteReminder?.(btn.dataset.reminder);return;}
      if(action==='mode'){prefs.mode=btn.dataset.mode;prefs.anchor=prefs.selected;render(q('#main'),ctx);return;}
      if(action==='today'){prefs.anchor=today();prefs.selected=today();render(q('#main'),ctx);return;}
      if(action==='pick'){prefs.selected=btn.dataset.date;document.querySelectorAll('[data-cal="pick"]').forEach(n=>{const selected=n.dataset.date===prefs.selected;n.classList.toggle('selected',selected);n.setAttribute('aria-pressed',String(selected));});refreshPanel();persist();return;}
      if(action==='previous'||action==='next'){move(action==='next'?1:-1);render(q('#main'),ctx);}
    });
    document.addEventListener('submit',async e=>{
      if(e.target.id!=='simo-reminder-form')return;
      e.preventDefault();const values=new FormData(e.target), plantId=String(values.get('plantId')||''),title=String(values.get('title')||'').trim(),date=String(values.get('date')||''),repeatDays=Number(values.get('repeatDays')||0);
      if(!getState().plants.some(p=>p.id===plantId)||!title||!/^\d{4}-\d\d-\d\d$/.test(date)||date<today()||!Number.isInteger(repeatDays)||repeatDays<0||repeatDays>365){ctx?.toast?.('Controlla pianta, attività e data.');return;}
      await ctx?.addReminder?.({plantId,title,date,repeatDays});
    });
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkAlerts();});
    window.addEventListener('focus',checkAlerts);
    setInterval(checkAlerts,30000);
    checkAlerts();
  }
  window.SIMO_CAL={boot,render,collect,downloadICS};
})();
