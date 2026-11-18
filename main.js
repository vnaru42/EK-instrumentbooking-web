import {conflicts,bookingColor,validateBooking} from './core.js';
let equipment=[
...Array.from({length:10},(_,i)=>({id:`TS-${String(i+1).padStart(2,'0')}`,kind:'Totalstation'})),
...Array.from({length:10},(_,i)=>({id:`ST-${String(i+1).padStart(2,'0')}`,kind:'Stativ til totalstation'})),
...Array.from({length:10},(_,i)=>({id:`PR-${String(i+1).padStart(2,'0')}`,kind:'Prisme'})),
...Array.from({length:3},(_,i)=>({id:`NIV-${String(i+1).padStart(2,'0')}`,kind:'Nivellementsinstrument'})),
...Array.from({length:2},(_,i)=>({id:`GNSS-${String(i+1).padStart(2,'0')}`,kind:'GNSS'})),
...Array.from({length:8},(_,i)=>({id:`BAT-${String(i+1).padStart(2,'0')}`,kind:'Batteri'}))
];

let bookings=[],selected=[],tab='out',subtab='out',expanded=null,filter='',week=mondayOf(new Date()),settingsSection='equipment';
const $=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function mondayOf(value){const d=new Date(value instanceof Date?value.getTime():value+'T12:00:00');d.setHours(12,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return iso(d)}
function shiftWeek(delta){const d=new Date(week+'T12:00:00');d.setDate(d.getDate()+delta*7);week=iso(d);render()}
function weekNumber(value){const d=new Date(value+'T12:00:00');const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));t.setUTCDate(t.getUTCDate()+4-(t.getUTCDay()||7));return Math.ceil((((t-new Date(Date.UTC(t.getUTCFullYear(),0,1)))/86400000)+1)/7)}
function dkDate(value){if(!value)return '';const [y,m,d]=value.split('-');return d+'/'+m+'/'+y}
function shortDate(value){return dkDate(value).slice(0,5)}
const nav=[['out','Udlån'],['reserved','Reservation'],['active','Aktive'],['overview','Kalender'],['equipment','Udstyr'],['history','Historik'],['settings','Indstillinger']];
function render(){
const form=tab==='out'||tab==='reserved';
$('app').innerHTML=`<header><h1>Udlånssystem</h1><span class="pill">DEMO</span></header><main>
<p class="notice">Kun fiktive oplysninger. Ingen login, database eller lagring. Alt nulstilles ved genindlæsning.</p>
<nav class="main-nav" aria-label="Hovedmenu">${nav.map(([id,label])=>`<button data-tab="${id}" class="${tab===id?'active':''}" aria-current="${tab===id?'page':'false'}">${label}</button>`).join('')}</nav><nav class="mobile-nav" aria-label="Mobilmenu">${[['out','Udlån','⇄'],['reserved','Reservation','▣'],['active','Aktive','☷'],['overview','Kalender','▦'],['more','Mere','☰']].map(([id,label,icon])=>`<button type="button" data-mobile="${id}" class="${tab===id||(id==='more'&&['equipment','history','settings'].includes(tab))?'active':''}"><span>${icon}</span><small>${label}</small></button>`).join('')}</nav><div id="more-menu" class="more-menu" hidden><button data-tab="equipment">Udstyr</button><button data-tab="history">Historik</button><button data-tab="settings">Indstillinger</button></div>
${tab==='history'?`<section class="panel"><h2>Historik</h2><label>Søg<input id="history-filter" placeholder="Navn, Bruger-ID, udstyr, booking-ID"></label><div id="history-records"></div></section>`:''}${tab==='settings'?`<section class="panel"><h2>Indstillinger (demo)</h2><p class="hint">Ingen reel login eller adgangskontrol endnu. Brugeradministration kræver backend.</p><div class="subtabs"><button data-settings="equipment">Udstyrsliste</button><button data-settings="users">Ansvarlige</button></div><div id="settings-body"></div></section>`:''}${tab==='active'?`<section class="panel"><h2>Aktive udlån og reservationer</h2><div class="subtabs"><button data-sub="out">Udlån</button><button data-sub="reserved">Reservationer</button></div><label>Søg<input id="filter" placeholder="Navn, Bruger-ID, klasse, udstyr eller booking-ID"></label><div id="records"></div></section>`:''}${form?`<section class="panel"><h2>${tab==='out'?'Nyt udlån':'Ny reservation'}</h2>
<form id="loanform"><input type="hidden" name="status" value="${tab}">
<div class="fields"><label>Navn<input name="borrower" required placeholder="Testperson"></label><label>Klasse<input name="klass" required placeholder="KLT-26"></label><label>Bruger-ID<input name="ekid" required pattern="[A-Za-z0-9]{3,20}" placeholder="test123" autocapitalize="none"></label></div><label>Tilføj udstyr<input id="search" autocomplete="off" placeholder="Søg fx TS-01, stativ, prisme"></label><div id="matches" class="matches"></div><div id="chosen"></div><div class="fields date-fields"><label>Fra<input name="start" type="date" value="${iso(new Date())}" required></label><label>Til<input name="end" type="date" value="${iso(new Date())}" required></label></div>
<label>Noter (valgfrit)<textarea name="note" rows="2" maxlength="500" placeholder="Bemærkninger"></textarea></label>

<button type="submit">Registrer ${tab==='out'?'udlån':'reservation'}</button><p id="error" role="alert"></p></form></section>`:''}
${form?`<section class="stats"><div><b>${equipment.length}</b><small>Udstyrsdele (demo)</small></div><div><b>${bookings.filter(b=>b.status==='out').length}</b><small>Aktive udlån</small></div><div><b>${bookings.filter(b=>b.status==='reserved').length}</b><small>Reservationer</small></div></section>`:''}
${['out','reserved','active','overview','equipment'].includes(tab)?`<section class="panel"><h2>${tab==='out'?'Aktive udlån · hurtig aflevering':tab==='reserved'?'Reservationer':tab==='equipment'?'Udstyrskalender':'Oversigtskalender'}</h2>
${tab==='overview'||tab==='equipment'?`<div class="week-navigation"><button type="button" class="week-arrow" data-week-shift="-1" aria-label="Forrige uge">‹</button><div class="week-current"><strong>Uge ${weekNumber(week)}</strong><span>${shortDate(week)} – ${shortDate((()=>{const d=new Date(week+'T12:00:00');d.setDate(d.getDate()+6);return iso(d)})())} ${week.slice(0,4)}</span></div><button type="button" class="week-arrow" data-week-shift="1" aria-label="Næste uge">›</button></div><button type="button" class="week-today" id="week-today">Denne uge</button>`:''}${tab==='equipment'?`<button type="button" id="manage-equipment" class="secondary">Tilføj / rediger / arkivér udstyr</button>`:''}<div id="calendar"></div></section>`:''}</main><dialog id="return-dialog" class="return-dialog"></dialog>`;
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;selected=[];render()});document.querySelectorAll('[data-mobile]').forEach(b=>b.onclick=()=>{if(b.dataset.mobile==='more'){$('more-menu').hidden=!$('more-menu').hidden;return}tab=b.dataset.mobile;selected=[];render()});if($('manage-equipment'))$('manage-equipment').onclick=()=>{tab='settings';settingsSection='equipment';render()};
if(form){$('search').oninput=renderMatches;$('loanform').onsubmit=submit;renderMatches()}
document.querySelectorAll('[data-week-shift]').forEach(b=>b.onclick=()=>shiftWeek(Number(b.dataset.weekShift)));if($('week-today'))$('week-today').onclick=()=>{week=mondayOf(new Date());render()};if(tab==='active'){document.querySelectorAll('[data-sub]').forEach(b=>b.onclick=()=>{subtab=b.dataset.sub;expanded=null;drawRecords()});$('filter').oninput=e=>{filter=e.target.value;drawRecords()};drawRecords()}if($('calendar'))draw();if(tab==='history'){$('history-filter').oninput=drawHistory;drawHistory()}if(tab==='settings'){document.querySelectorAll('[data-settings]').forEach(x=>x.onclick=()=>{settingsSection=x.dataset.settings;drawSettings()});drawSettings()}
}
function renderMatches(){
const q=$('search').value.trim().toLowerCase();
const f=Object.fromEntries(new FormData($('loanform')));const sorted=equipment.filter(e=>!e.archived&&!selected.includes(e.id)&&(e.id.toLowerCase().includes(q)||e.kind.toLowerCase().includes(q))).sort((a,b)=>Number(!!conflicts([a.id],bookings,f.start,f.end).length)-Number(!!conflicts([b.id],bookings,f.start,f.end).length));$('matches').innerHTML=q?sorted.slice(0,15).map(e=>{const hit=conflicts([e.id],bookings,f.start,f.end)[0];return `<button type="button" class="secondary equipment-choice ${hit?'unavailable':''}" data-add="${e.id}">${e.id} · ${e.kind}${hit?' · OPTAGET':''}</button>`}).join('')||'<p>Ingen resultater</p>':'<p class="hint">Søg efter udstyrsnummer eller type.</p>';
$('chosen').innerHTML=`<p><strong>Valgt udstyr (${selected.length})</strong></p>`+selected.map(id=>`<button type="button" class="chip" data-remove="${id}">${id} ×</button>`).join('');
document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const f=Object.fromEntries(new FormData($('loanform')));const hit=conflicts([b.dataset.add],bookings,f.start,f.end)[0];if(hit){$('error').textContent=`${b.dataset.add} er ${hit.status==='out'?'udlånt':'reserveret'} fra ${hit.start} til ${hit.end}. Vælg en anden periode.`;return}selected.push(b.dataset.add);$('search').value='';renderMatches()});
document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{selected=selected.filter(id=>id!==b.dataset.remove);renderMatches()});
}
function submit(e){
e.preventDefault();const data=Object.fromEntries(new FormData(e.target)),items=[...selected];
let err=validateBooking({...data,items});
const hits=conflicts(items,bookings,data.start,data.end);
if(hits.length)err='Udstyr allerede booket i perioden: '+[...new Set(hits.flatMap(b=>b.items.filter(i=>items.includes(i))))].join(', ');
if(err){$('error').textContent=err;return}
bookings.push({...data,items,id:'B-'+String(bookings.length+1).padStart(3,'0')});
selected=[];tab='active';subtab=data.status;expanded=bookings.at(-1).id;filter='';render();
}
function draw(){
const days=Array.from({length:7},(_,i)=>{const d=new Date(week+'T12:00:00');d.setDate(d.getDate()+i);return iso(d)});
const rows=tab==='equipment'?equipment.map(e=>({label:e.id,items:bookings.filter(b=>b.items.includes(e.id)&&b.status!=='returned')})):bookings.filter(b=>b.status!=='returned').map(b=>({label:b.id+' · '+b.borrower,items:[b]}));
let html='<div class="timeline"><div class="timeline-head"><span>'+ (tab==='equipment'?'Udstyr':'Booking')+'</span>'+days.map((d,i)=>'<span>'+['Man','Tir','Ons','Tor','Fre','Lør','Søn'][i]+'<br>'+shortDate(d)+'</span>').join('')+'</div>';
for(const row of rows){
html+='<div class="timeline-row"><div class="timeline-label">'+safe(row.label)+'</div><div class="timeline-track">';
for(const b of row.items){
if(b.start>days[6]||b.end<days[0])continue;
const first=b.start<=days[0]?0:days.indexOf(b.start),last=b.end>=days[6]?6:days.indexOf(b.end);
if(first<0||last<0)continue;
html+='<button type="button" class="timeline-bar" style="left:'+(first*100/7)+'%;width:'+((last-first+1)*100/7)+'%;background:'+bookingColor(b.id)+'" data-booking="'+b.id+'">'+safe(b.id)+'</button>';
}
html+='</div></div>';
}
html+='</div>';
if(!rows.length)html+='<p class="hint">Ingen bookinger endnu.</p>';
$('calendar').innerHTML=html;
document.querySelectorAll('[data-booking]').forEach(x=>x.onclick=()=>{const b=bookings.find(v=>v.id===x.dataset.booking);tab='active';subtab=b.status;expanded=b.id;render()});
}
function drawRecords(){const q=($('filter')?.value||'').toLowerCase();document.querySelectorAll('[data-sub]').forEach(b=>b.classList.toggle('active',b.dataset.sub===subtab));const rows=bookings.filter(b=>b.status===subtab&&[b.id,b.borrower,b.klass,b.ekid,b.note,...b.items].join(' ').toLowerCase().includes(q));$('records').innerHTML=rows.map(b=>`<article class="record"><button type="button" class="record-title" data-open="${b.id}"><strong>${safe(b.id)} · ${safe(b.borrower)}</strong><small>${safe(b.start)} – ${safe(b.end)} ${expanded===b.id?'⌃':'⌄'}</small></button>${expanded===b.id?`<div class="record-details"><div>${safe(b.klass)} · ${safe(b.ekid)}</div><div>Udstyr: ${safe(b.items.join(', '))}</div>${b.note?`<div>Note: ${safe(b.note)}</div>`:''}${b.status==='out'?`<button class="secondary" data-return="${b.id}">Aflever</button>`:''}${b.status==='reserved'?`<button class="secondary" data-checkout="${b.id}">Udlever</button>`:''}</div>`:''}</article>`).join('')||'<p class="hint">Ingen registreringer.</p>';document.querySelectorAll('[data-open]').forEach(x=>x.onclick=()=>{expanded=expanded===x.dataset.open?null:x.dataset.open;drawRecords()});document.querySelectorAll('[data-return]').forEach(x=>x.onclick=()=>{openReturnDialog(x.dataset.return)});document.querySelectorAll('[data-checkout]').forEach(x=>x.onclick=()=>{const b=bookings.find(v=>v.id===x.dataset.checkout);if(conflicts(b.items,bookings,b.start,b.end,b.id).length){alert('Udstyret er optaget');return}b.status='out';subtab='out';render()})}

function openReturnDialog(id){
const b=bookings.find(x=>x.id===id&&x.status==='out');if(!b)return;
const dlg=$('return-dialog');
dlg.innerHTML='<form id="return-form"><h2>Aflevering · '+safe(b.id)+'</h2><p>Markér kun de instrumenter, der afleveres.</p><div class="return-items">'+b.items.map(item=>'<label class="return-item"><input type="checkbox" name="item" value="'+safe(item)+'"><span>'+safe(item)+'</span></label>').join('')+'</div><p id="return-error" role="alert"></p><div class="dialog-actions"><button type="button" class="secondary" id="cancel-return">Annuller</button><button type="submit">Bekræft aflevering</button></div></form>';
$('cancel-return').onclick=()=>dlg.close();
$('return-form').onsubmit=e=>{
e.preventDefault();const returned=new FormData(e.target).getAll('item');
if(!returned.length){$('return-error').textContent='Vælg mindst ét instrument';return}
const remaining=b.items.filter(item=>!returned.includes(item)),now=new Date().toISOString();
if(!remaining.length){b.status='returned';b.returnedAt=now;b.returnedItems=[...b.items]}
else{
const root=b.rootId||b.id.split('.')[0];
const next=Math.max(0,...bookings.filter(x=>(x.rootId||x.id.split('.')[0])===root).map(x=>Number(x.id.split('.')[1])||0))+1;
bookings.push({...b,id:root+'.'+next,rootId:root,items:remaining,status:'out',returnedAt:null,returnedItems:[],parentId:b.id});
b.status='returned';b.returnedAt=now;b.returnedItems=returned;b.partial=true;
}
dlg.close();expanded=remaining.length?bookings.at(-1).id:null;render();
};dlg.showModal();
}

function drawHistory(){
const q=($('history-filter').value||'').toLowerCase();
const rows=bookings.filter(b=>['returned','cancelled'].includes(b.status)&&[b.id,b.borrower,b.klass,b.ekid,b.note,...b.items].join(' ').toLowerCase().includes(q));
$('history-records').innerHTML=rows.map(b=>'<article class="record"><button type="button" class="record-title" data-hist="'+safe(b.id)+'"><strong>'+safe(b.id)+' · '+safe(b.borrower)+'</strong><small>'+ (b.status==='returned'?'Afleveret':'Annulleret')+' '+(expanded===b.id?'⌃':'⌄')+'</small></button>'+(expanded===b.id?'<div class="record-details">Periode: '+safe(b.start)+' – '+safe(b.end)+'<div>Udstyr: '+safe(b.items.join(', '))+'</div><div>Bruger-ID: '+safe(b.ekid)+'</div>'+(b.returnedAt?'<div>Afleveret: '+safe(new Date(b.returnedAt).toLocaleString('da-DK'))+'</div>':'')+'</div>':'')+'</article>').join('')||'<p class="hint">Ingen afsluttede registreringer endnu.</p>';
document.querySelectorAll('[data-hist]').forEach(x=>x.onclick=()=>{expanded=expanded===x.dataset.hist?null:x.dataset.hist;drawHistory()});
}
function drawSettings(){
const body=$('settings-body');
document.querySelectorAll('[data-settings]').forEach(x=>x.classList.toggle('active',x.dataset.settings===settingsSection));
if(settingsSection==='users'){
body.innerHTML='<h3>Instrumentansvarlige</h3><div class="responsible-table"><div class="responsible-row responsible-heading"><span>Navn</span><span>Rolle</span></div><div class="responsible-row"><span>Systemejer</span><span>Systemadministrator</span></div><div class="responsible-row"><span>Instrumentleder</span><span>Administrator</span></div><div class="responsible-row"><span>Øvrige ansvarlige</span><span>Instrumentansvarlig</span></div></div><p class="hint">Eksempel på roller – ingen virkelige konti endnu. Invitation og brugeradministration kræver backend.</p>';
return;
}
body.innerHTML='<form id="add-equipment"><h3>Tilføj udstyr</h3><div class="fields"><label>Udstyrs-ID<input name="id" required maxlength="30" placeholder="TS-11"></label><label>Type<input name="kind" required maxlength="80" placeholder="Totalstation"></label></div><button type="submit">Tilføj</button><p id="settings-error" role="alert"></p></form><h3>Udstyrsliste</h3><div class="settings-list">'+equipment.map(e=>'<div class="settings-row"><span><b>'+safe(e.id)+'</b> · '+safe(e.kind)+(e.archived?' (arkiveret)':'')+'</span><div class="settings-actions"><button type="button" class="secondary" data-edit="'+safe(e.id)+'">Rediger</button><button class="secondary" data-archive="'+safe(e.id)+'">'+(e.archived?'Genaktiver':'Arkivér')+'</button></div></div>').join('')+'</div>';
$('add-equipment').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),id=String(f.get('id')).trim().toUpperCase(),kind=String(f.get('kind')).trim();if(equipment.some(x=>x.id===id)){$('settings-error').textContent='ID findes allerede';return}equipment.push({id,kind});drawSettings()};
document.querySelectorAll('[data-edit]').forEach(x=>x.onclick=()=>{const item=equipment.find(e=>e.id===x.dataset.edit);const row=x.closest('.settings-row');row.innerHTML='<form class="edit-equipment"><label>Udstyrs-ID<input name="id" maxlength="30" required value="'+safe(item.id)+'"></label><label>Type<input name="kind" maxlength="80" required value="'+safe(item.kind)+'"></label><button type="button" class="secondary" data-cancel-edit>Annuller</button><button type="submit">Gem ændringer</button><p class="edit-error" role="alert"></p></form>';row.querySelector('[data-cancel-edit]').onclick=drawSettings;row.querySelector('form').onsubmit=ev=>{ev.preventDefault();const f=new FormData(ev.target),id=String(f.get('id')).trim().toUpperCase(),kind=String(f.get('kind')).trim();if(!id||!kind){row.querySelector('.edit-error').textContent='Udfyld begge felter';return}if(equipment.some(e=>e!==item&&e.id===id)){row.querySelector('.edit-error').textContent='ID findes allerede';return}if(id!==item.id&&bookings.some(b=>b.items.includes(item.id))){row.querySelector('.edit-error').textContent='ID kan ikke ændres, når udstyret har bookinghistorik.';return}item.id=id;item.kind=kind;drawSettings()}});
document.querySelectorAll('[data-archive]').forEach(x=>x.onclick=()=>{const item=equipment.find(e=>e.id===x.dataset.archive);if(!item.archived&&bookings.some(b=>['out','reserved'].includes(b.status)&&b.items.includes(item.id))){$('settings-error').textContent='Udstyret har aktive bookinger og kan ikke arkiveres.';return}item.archived=!item.archived;drawSettings()});
}
render();
