/* Presentational renderer for editorial IPO schedule. Not a real-time feed. */
(function(w,d){
'use strict';
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
function dayIST(){var fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'});var p=fmt.formatToParts(new Date()),z={};p.forEach(function(v){z[v.type]=v.value});return z.year+'-'+z.month+'-'+z.day}
function dateFmt(v){return new Date(v+'T12:00:00Z').toLocaleDateString('en-GB',{day:'2-digit',month:'short',timeZone:'UTC'})}
var m=w.AngelIPOData;
if(!m){return}
var today=dayIST();
function status(v){return today<v.open?'Scheduled upcoming':today>v.close?'Scheduled window elapsed':'Scheduled window'}
function sortItems(items){return items.slice().sort(function(a,b){return a.open.localeCompare(b.open)||a.name.localeCompare(b.name)})}
function item(v){
 var href='ipo-current.html#'+encodeURIComponent(v.id);
 return '<article class="ipo-card" id="'+esc(v.id)+'"><div class="ipo-card-top"><span class="ipo-pill">'+esc(v.segment)+'</span><span class="ipo-state">'+esc(status(v))+'</span></div><h3>'+esc(v.name)+'</h3><div class="ipo-band">₹'+esc(v.low)+'–'+esc(v.high)+'</div><div class="ipo-row"><span>Scheduled bid window</span><b>'+esc(dateFmt(v.open))+' – '+esc(dateFmt(v.close))+'</b></div><div class="ipo-row"><span>Indicative issue size</span><b>'+esc(v.size)+'</b></div><div class="ipo-row"><span>Retail lot</span><b>'+esc(v.lot?String(v.lot)+' shares':'See offer document')+'</b></div><p>'+esc(v.notes)+'</p><a href="'+href+'">ISSUE DETAILS &amp; SOURCES →</a></article>';
}
function render(el){
 var type=el.getAttribute('data-ipo-mode')||'compact';
 var data=sortItems(m.issues);
 if(type==='compact') data=data.filter(function(v){return today<=v.close}).slice(0,4);
 var header='<div class="ipo-board-head"><div><div class="ipo-kicker">INDIA PRIMARY MARKETS · EDITORIAL UPDATE</div><h2>'+(type==='compact'?'Latest IPO schedules':'IPO issue calendar &amp; company profiles')+'</h2><p>Last checked: <strong>'+esc(m.verifiedDate)+'</strong> · This schedule is not a real-time data feed.</p></div>'+(type==='compact'?'<a class="ipo-full-link" href="ipo-current.html">EXPLORE ALL IPOs ↗</a>':'')+'</div>';
 var caut= '<p class="ipo-caution" role="note"><strong>Important:</strong> Open/closed labels describe the calendar window only; they do not confirm real-time subscription activity. All terms should be reconfirmed with official exchange or issuer filings.</p>';
 if(type==='full'){
   var nav='<div class="ipo-filters" role="group" aria-label="Filter IPO issues"><button type="button" data-filter="all" aria-pressed="true">All issues</button><button type="button" data-filter="Mainboard" aria-pressed="false">Mainboard</button><button type="button" data-filter="SME" aria-pressed="false">SME</button></div>';
   var archived='<section class="ipo-archive" aria-label="Previous IPO research"><h2>Historical IPO coverage</h2><p>Earlier research is retained with its original date and not relabelled as current.</p><div class="ipo-archive-list">'+m.archived.map(function(v){return '<div><b>'+esc(v.name)+'</b><span>'+esc(v.detail)+'</span><a href="'+esc(v.link)+'">Read dated review →</a></div>'}).join('')+'</div></section>';
   var sources='<section class="ipo-sources"><h2>Sources &amp; verification</h2><p>Editorial source directory. Verify final prospectus, allotments and prices directly before taking any action.</p><a href="'+m.sources.sebi+'" target="_blank" rel="noopener noreferrer">SEBI Public Issues ↗</a><a href="'+m.sources.idbi+'" target="_blank" rel="noopener noreferrer">IDBI IPO Calendar ↗</a><a href="'+m.sources.businessstandard+'" target="_blank" rel="noopener noreferrer">Business Standard IPO Tracker ↗</a><a href="'+m.sources.reuters+'" target="_blank" rel="noopener noreferrer">Zetwerk · Reuters 12 Oct ↗</a></section>';
   el.innerHTML=header+nav+'<div class="ipo-card-grid" id="ipo-issues">'+data.map(item).join('')+'</div>'+caut+archived+sources;
   var buttons=el.querySelectorAll('[data-filter]');
   buttons.forEach(function(b){b.addEventListener('click',function(){
     var value=b.getAttribute('data-filter');
     buttons.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});
     var matches=value==='all'?data:data.filter(function(x){return x.segment===value});
     var grid=el.querySelector('#ipo-issues');
     grid.innerHTML=matches.map(item).join('');
     if(w.location.hash){var match=grid.querySelector('#'+w.location.hash.replace(/^#/,''));
       if(match)match.scrollIntoView({block:'start'})}
   })});
 }else{
   el.innerHTML=header+'<div class="ipo-card-grid">'+data.map(item).join('')+'</div>'+caut;
 }
 var lastChecked=Date.parse('2026-10-13T00:00:00Z');
 if(Date.now()>lastChecked+3*24*3600*1000){
   var alert=d.createElement('div');alert.className='ipo-aged';alert.textContent='The published data is more than three days old. Treat all schedule statuses as unverified until the next editorial update.';
   el.insertBefore(alert,el.firstChild);
 }
}
d.querySelectorAll('[data-ipo-board]').forEach(render);
})(window,document);
