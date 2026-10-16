/* Presentational renderer for editorial IPO schedule. Not a real-time feed. */
(function(w,d){
'use strict';
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
function dayIST(){var fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'});var p=fmt.formatToParts(new Date()),z={};p.forEach(function(v){z[v.type]=v.value});return z.year+'-'+z.month+'-'+z.day}
function dateFmt(v){return new Date(v+'T12:00:00Z').toLocaleDateString('en-GB',{day:'2-digit',month:'short',timeZone:'UTC'})}
var m=w.AngelIPOData,E=w.AngelIPOEvidence;
if(!m){return}
var today=dayIST();
function stage(v){return today<v.open?'upcoming':today>v.close?'elapsed':'window'}
function status(v){var k=stage(v);return k==='upcoming'?'Scheduled upcoming':k==='elapsed'?'Scheduled window elapsed':'Scheduled bid window'}
function srcName(id){return ({sebi:'SEBI',exchange:'NSE',bse:'BSE',groww:'Groww',calendar:'IPO calendar',reuters:'Reuters',jioReuters:'Reuters',financialExpress:'Financial Express',expressHealth:'Express Healthcare',sebiConsultation:'Reuters'})[id]||'Reported source'}
function sortItems(items){return items.slice().sort(function(a,b){return a.open.localeCompare(b.open)||a.name.localeCompare(b.name)})}
function item(v){
 var href=v.detail||'ipo-company.html?issue='+encodeURIComponent(v.id);
 var source=m.sources[v.source]||'';
 var classified=E?E.classify(v,m):null;
 var tier=classified?'<span class="v41-source-tier" title="Source category, not independent verification">'+esc(classified.label)+'</span>':'';
 var sourceLink=/^https:\/\//.test(source)?'<a class="ipo-original-source" href="'+esc(source)+'" target="_blank" rel="noopener noreferrer">SOURCE: '+esc(srcName(v.source))+' ↗</a>':'';
 return '<article class="ipo-card'+(v.featured?' ipo-card-featured':'')+'" id="'+esc(v.id)+'" data-stage="'+stage(v)+'"><div class="ipo-card-top"><span class="ipo-pill">'+esc(v.segment)+'</span><span class="ipo-state">'+esc(status(v))+'</span></div><h3>'+esc(v.name)+'</h3><div class="ipo-band">₹'+esc(v.low)+'–'+esc(v.high)+'</div><div class="ipo-row"><span>Scheduled bid window</span><b>'+esc(dateFmt(v.open))+' – '+esc(dateFmt(v.close))+'</b></div><div class="ipo-row"><span>Reported issue size</span><b>'+esc(v.size)+'</b></div><div class="ipo-row"><span>Retail lot</span><b>'+esc(v.lot?String(v.lot)+' shares':'See offer document')+'</b></div><p>'+esc(v.notes)+'</p><div class="ipo-card-actions"><a href="'+href+'">ISSUE DETAILS →</a>'+tier+sourceLink+'</div></article>';
}
function briefing(){
 if(!Array.isArray(m.briefing)||!m.briefing.length)return '';
 return '<section class="ipo-briefing" aria-label="Latest editorial IPO updates"><div class="ipo-briefing-title"><span>EDITORIAL MARKET BRIEF · '+esc(m.verifiedDate)+'</span><h2>What investors are watching</h2><p>Source-dated reporting. No unofficial estimates or guaranteed allotment.</p></div><div class="ipo-briefing-grid">'+
  m.briefing.map(function(v){return '<article class="ipo-brief"><div class="ipo-brief-meta"><span>'+esc(v.topic)+'</span><time>'+esc(v.date)+'</time></div><h3>'+esc(v.title)+'</h3><p>'+esc(v.summary)+'</p><div class="ipo-brief-links"><span>'+esc(v.tag)+'</span><a href="'+esc(m.sources[v.source])+'" target="_blank" rel="noopener noreferrer">VIEW SOURCE ↗</a></div></article>'}).join('')+'</div></section>'
}
function render(el){
 var type=el.getAttribute('data-ipo-mode')||'compact';
 var data=sortItems(m.issues);
 if(type==='compact') data=data.filter(function(v){return v.segment==='Mainboard'&&today<=v.close}).sort(function(a,b){return Number(!!b.featured)-Number(!!a.featured)||a.open.localeCompare(b.open)}).slice(0,6);
 var review=E?E.freshness(m.checkedAt):{code:'unknown',text:'Dated editorial snapshot'};
 var header='<div class="ipo-board-head"><div><div class="ipo-kicker">INDIA PRIMARY MARKETS · EDITORIAL UPDATE</div><h2>'+(type==='compact'?'Latest IPO schedules':'IPO issue calendar &amp; company profiles')+'</h2><p>Last checked: <strong>'+esc(m.verifiedDate)+'</strong> · This schedule is not a real-time data feed.</p><p class="v41-board-status" data-review-status="'+esc(review.code)+'">'+esc(review.text)+' · <a href="ipo-data-quality.html">Evidence &amp; source ledger →</a></p></div>'+(type==='compact'?'<a class="ipo-full-link" href="ipo-current.html">EXPLORE ALL IPOs ↗</a>':'')+'</div>';
 var caut= '<p class="ipo-caution" role="note"><strong>Important:</strong> Open/closed labels describe the calendar window only; they do not confirm real-time subscription activity. All terms should be reconfirmed with official exchange or issuer filings.</p>';
 if(type==='full'){
   var nav='<div class="ipo-intelligence-controls"><div class="ipo-filters" role="group" aria-label="Filter IPO segment"><button type="button" data-filter="all" aria-pressed="true">All issues</button><button type="button" data-filter="Mainboard" aria-pressed="false">Mainboard</button><button type="button" data-filter="SME" aria-pressed="false">SME</button></div><div class="ipo-filters ipo-stage-filters" role="group" aria-label="Filter scheduled IPO stage"><button type="button" data-stage-filter="all" aria-pressed="true">All dates</button><button type="button" data-stage-filter="upcoming" aria-pressed="false">Upcoming</button><button type="button" data-stage-filter="window" aria-pressed="false">Bid window</button><button type="button" data-stage-filter="elapsed" aria-pressed="false">Elapsed</button></div><p class="ipo-results-count" id="ipo-results-count" aria-live="polite"></p></div>';
   var archived='<section class="ipo-archive" aria-label="Previous IPO research"><h2>Historical IPO coverage</h2><p>Earlier research is retained with its original date and not relabelled as current.</p><div class="ipo-archive-list">'+m.archived.map(function(v){return '<div><b>'+esc(v.name)+'</b><span>'+esc(v.detail)+'</span><a href="'+esc(v.link)+'">Read dated review →</a></div>'}).join('')+'</div></section>';
   var sources='<section class="ipo-sources"><h2>Sources &amp; verification</h2><p>Curated public coverage as of '+esc(m.verifiedDate)+'. Issuer/SEBI/NSE/BSE disclosures override media calendars. Confirm before applying.</p><a href="'+m.sources.sebi+'" target="_blank" rel="noopener noreferrer">SEBI public issues ↗</a><a href="'+m.sources.exchange+'" target="_blank" rel="noopener noreferrer">NSE IPO notices ↗</a><a href="'+m.sources.groww+'" target="_blank" rel="noopener noreferrer">Groww IPO calendar ↗</a><a href="'+m.sources.jioReuters+'" target="_blank" rel="noopener noreferrer">Jio · Reuters 15 Oct ↗</a><a href="'+m.sources.reuters+'" target="_blank" rel="noopener noreferrer">Zetwerk · Reuters 12 Oct ↗</a></section>';
   el.innerHTML=header+briefing()+nav+'<div class="ipo-card-grid" id="ipo-issues">'+data.map(item).join('')+'</div>'+caut+archived+sources;
   var buttons=el.querySelectorAll('[data-filter]');
   var stageButtons=el.querySelectorAll('[data-stage-filter]');
   var segment='all',selectedStage='all';
   function updateResults(){
     var matches=data.filter(function(x){return (segment==='all'||x.segment===segment)&&(selectedStage==='all'||stage(x)===selectedStage)});
     var grid=el.querySelector('#ipo-issues');
     grid.innerHTML=matches.length?matches.map(item).join(''):'<p class="ipo-empty">No issues match these editorial filters. Try All issues or All dates.</p>';
     var count=el.querySelector('#ipo-results-count');
     if(count)count.textContent=matches.length+' of '+data.length+' dated IPO records shown · Scheduling categories are not real-time subscription confirmations.';
     if(w.location.hash){var key=w.location.hash.replace(/^#/,'');var match=Array.from(grid.querySelectorAll('.ipo-card')).find(function(x){return x.id===key});if(match)match.scrollIntoView({block:'start'})}
   }
   buttons.forEach(function(b){b.addEventListener('click',function(){segment=b.getAttribute('data-filter');buttons.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});updateResults()})});
   stageButtons.forEach(function(b){b.addEventListener('click',function(){selectedStage=b.getAttribute('data-stage-filter');stageButtons.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});updateResults()})});
   updateResults();
 }else{
   el.innerHTML=header+briefing()+'<div class="ipo-card-grid">'+data.map(item).join('')+'</div>'+caut;
 }
 var lastChecked=Date.parse(m.checkedAt);
 if(Date.now()>lastChecked+2*24*3600*1000){
   var alert=d.createElement('div');alert.className='ipo-aged';alert.textContent='The IPO editorial review is more than two days old. Check official NSE/BSE notices and the latest prospectuses before using issue dates, bands or lot sizes.';
   el.insertBefore(alert,el.firstChild);
 }
}
d.querySelectorAll('[data-ipo-board]').forEach(render);
})(window,document);
