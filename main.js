import {conflicts,bookingColor,validateBooking} from './core.js';
const equipment=[
...Array.from({length:10},(_,i)=>({id:`TS-${String(i+1).padStart(2,'0')}`,kind:'Totalstation'})),
...Array.from({length:10},(_,i)=>({id:`ST-${String(i+1).padStart(2,'0')}`,kind:'Stativ til totalstation'})),
...Array.from({length:10},(_,i)=>({id:`PR-${String(i+1).padStart(2,'0')}`,kind:'Prisme'})),
...Array.from({length:3},(_,i)=>({id:`NIV-${String(i+1).padStart(2,'0')}`,kind:'Nivellementsinstrument'})),
...Array.from({length:2},(_,i)=>({id:`GNSS-${String(i+1).padStart(2,'0')}`,kind:'GNSS'})),
...Array.from({length:8},(_,i)=>({id:`BAT-${String(i+1).padStart(2,'0')}`,kind:'Batteri'}))
];

let bookings=[],selected=[],tab='out',week=iso(new Date());
const $=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
const nav=[['out','Udlån'],['reserved','Reservation'],['overview','Kalender'],['equipment','Udstyr']];
function render(){
const form=tab==='out'||tab==='reserved';
$('app').innerHTML=`<header><h1>EK Instrumentbooking</h1><span class="pill">DEMO</span></header><main>
<p class="notice">Kun fiktive oplysninger. Ingen login, database eller lagring. Alt nulstilles ved genindlæsning.</p>
<nav class="main-nav" aria-label="Hovedmenu">${nav.map(([id,label])=>`<button data-tab="${id}" class="${tab===id?'active':''}" aria-current="${tab===id?'page':'false'}">${label}</button>`).join('')}</nav>
${form?`<section class="panel"><h2>${tab==='out'?'Nyt udlån':'Ny reservation'}</h2>
<form id="loanform"><input type="hidden" name="status" value="${tab}">
<div class="fields"><label>Navn<input name="borrower" required placeholder="Testperson"></label><label>Klasse<input name="klass" required placeholder="KLT-26"></label><label>EK-ID<input name="ekid" required pattern="[A-Za-z0-9]{3,20}" placeholder="test123" autocapitalize="none"></label><label>Fra<input name="start" type="date" value="${iso(new Date())}" required></label><label>Til<input name="end" type="date" value="${iso(new Date())}" required></label></div>
<label>Noter (valgfrit)<textarea name="note" rows="2" maxlength="500" placeholder="Bemærkninger"></textarea></label>
<label>Tilføj udstyr<input id="search" autocomplete="off" placeholder="Søg fx TS-01, stativ, prisme"></label><div id="matches" class="matches"></div><div id="chosen"></div>
<button type="submit">Registrer ${tab==='out'?'udlån':'reservation'}</button><p id="error" role="alert"></p></form></section>`:''}
<section class="stats"><div><b>${equipment.length}</b><small>Udstyrsdele (demo)</small></div><div><b>${bookings.filter(b=>b.status==='out').length}</b><small>Aktive udlån</small></div><div><b>${bookings.filter(b=>b.status==='reserved').length}</b><small>Reservationer</small></div></section>
<section class="panel"><h2>${tab==='out'?'Aktive udlån · hurtig aflevering':tab==='reserved'?'Reservationer':tab==='equipment'?'Udstyrskalender':'Oversigtskalender'}</h2>
${tab==='overview'||tab==='equipment'?`<label class="week-picker">Vis uge fra<input type="date" id="week" value="${week}"></label>`:''}<div id="calendar"></div></section></main>`;
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;selected=[];render()});
if(form){$('search').oninput=renderMatches;$('loanform').onsubmit=submit;renderMatches()}
if($('week'))$('week').onchange=e=>{week=e.target.value;draw()};
draw();
}
function renderMatches(){
const q=$('search').value.trim().toLowerCase();
$('matches').innerHTML=q?equipment.filter(e=>!selected.includes(e.id)&&(e.id.toLowerCase().includes(q)||e.kind.toLowerCase().includes(q))).slice(0,15).map(e=>`<button type="button" class="secondary" data-add="${e.id}">+ ${e.id} · ${e.kind}</button>`).join('')||'<p>Ingen resultater</p>':'<p class="hint">Søg efter udstyrsnummer eller type.</p>';
$('chosen').innerHTML=`<p><strong>Valgt udstyr (${selected.length})</strong></p>`+selected.map(id=>`<button type="button" class="chip" data-remove="${id}">${id} ×</button>`).join('');
document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{selected.push(b.dataset.add);$('search').value='';renderMatches()});
document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{selected=selected.filter(id=>id!==b.dataset.remove);renderMatches()});
}
function submit(e){
e.preventDefault();const data=Object.fromEntries(new FormData(e.target)),items=[...selected];
let err=validateBooking({...data,items});
const hits=conflicts(items,bookings,data.start,data.end);
if(hits.length)err='Udstyr allerede booket i perioden: '+[...new Set(hits.flatMap(b=>b.items.filter(i=>items.includes(i))))].join(', ');
if(err){$('error').textContent=err;return}
bookings.push({...data,items,id:'B-'+String(bookings.length+1).padStart(3,'0')});
selected=[];render();
}
function draw(){
const filtered=tab==='out'?bookings.filter(b=>b.status==='out'):tab==='reserved'?bookings.filter(b=>b.status==='reserved'):bookings;
let html='';
if(tab==='overview'||tab==='equipment'){
const days=Array.from({length:7},(_,i)=>{const d=new Date(week+'T12:00:00');d.setDate(d.getDate()+i);return iso(d)});
const rows=tab==='equipment'?equipment.map(e=>({label:e.id,items:bookings.filter(b=>b.items.includes(e.id))})):bookings.map(b=>({label:b.id,items:[b]}));
html+=`<div class="calendar"><div class="cell head">${tab==='equipment'?'Udstyr':'Booking'}</div>${days.map(d=>`<div class="cell head">${d.slice(5)}</div>`).join('')}`;
for(const row of rows){html+=`<div class="cell label">${safe(row.label)}</div>`;for(const day of days){const b=row.items.find(x=>x.status!=='returned'&&x.start<=day&&x.end>=day);html+=`<div class="cell">${b?`<span class="event" style="background:${bookingColor(b.id)}">${safe(b.id)}</span>`:''}</div>`}}
html+='</div>';
}
if(tab!=='equipment'){
if(!filtered.length)html+='<p class="hint">Ingen registreringer endnu i denne visning.</p>';
html+=filtered.map(b=>`<article class="loan"><div class="loan-top"><strong>${safe(b.id)}</strong><span class="status">${b.status==='out'?'Udlånt':b.status==='reserved'?'Reserveret':'Afleveret'}</span></div><div>${safe(b.borrower)} · ${safe(b.klass)} · ${safe(b.ekid)}</div><div>${safe(b.start)} – ${safe(b.end)}</div><div>Udstyr: ${safe(b.items.join(', '))}</div>${b.note?`<div>Note: ${safe(b.note)}</div>`:''}${b.status==='out'?`<button class="secondary" data-return="${b.id}">Aflever</button>`:''}${b.status==='reserved'?`<button class="secondary" data-checkout="${b.id}">Udlever</button>`:''}</article>`).join('');
}
$('calendar').innerHTML=html;
document.querySelectorAll('[data-return]').forEach(btn=>btn.onclick=()=>{bookings.find(b=>b.id===btn.dataset.return).status='returned';render()});
document.querySelectorAll('[data-checkout]').forEach(btn=>btn.onclick=()=>{const b=bookings.find(x=>x.id===btn.dataset.checkout);if(conflicts(b.items,bookings,b.start,b.end,b.id).length){alert('Udstyret er optaget');return}b.status='out';render()});
}
render();
