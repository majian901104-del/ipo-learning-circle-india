/* V4.2 official SEBI public-filing discovery. The source never contains prices,
   real-time subscriptions, IPO allotment data, or an authorized trading feed. */
(function(window,document){
 'use strict';
 var root=document.querySelector('[data-sebi-filings-watch]');
 if(!root)return;
 var official='https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&smid=11&ssid=15';
 function el(tag,txt,cls){var n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n}
 function safeUrl(url){try{var u=new URL(url);return u.protocol==='https:'&&u.hostname==='www.sebi.gov.in'&&u.pathname.startsWith('/filings/public-issues/')?u.href:null}catch(e){return null}}
 function labelDate(s){var d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'})+' IST':'Time unavailable'}
 function showState(text,cls){
  var target=root.querySelector('[data-sebi-fetch-status]');
  if(target){target.textContent=text;target.className='v42-fetch-status '+(cls||'')}
 }
 function render(json){
  if(!json||json.schemaVersion!=='4.2'||json.feedType!=='official-public-document-index'||!Array.isArray(json.records))throw Error('Unrecognized feed structure');
  var rawDate=Date.parse(json.fetchedAtUtc);
  if(!Number.isFinite(rawDate))throw Error('Invalid verified retrieval timestamp');
  var items=json.records.filter(function(v){return v&&safeUrl(v.sebiPageUrl)&&v.filingDate&&v.title&&v.evidenceType==='official-filing-index'}).slice(0,8);
  if(!items.length)throw Error('No valid SEBI filing index entries');
  var now=Date.now(),hours=Math.max(0,(now-rawDate)/36e5);
  var fresh=hours<=72;
  showState((fresh?'Official source index retrieved':'Historical source snapshot — refresh overdue')+' · '+labelDate(json.fetchedAtUtc),fresh?'v42-fresh':'v42-aged');
  var count=root.querySelector('[data-sebi-count]');if(count)count.textContent=String(items.length)+' latest filings';
  var list=root.querySelector('[data-sebi-items]');list.replaceChildren();
  items.forEach(function(v){
   var a=el('a');a.href=safeUrl(v.sebiPageUrl);a.target='_blank';a.rel='noopener noreferrer';a.className='v42-filing-card';
   var cap=el('span','SEBI · '+v.documentType.toUpperCase()+' · '+v.filingDate,'v42-filing-meta');
   var title=el('strong',v.title,'v42-filing-title');
   var arrow=el('span','Open official filing ↗','v42-filing-link');
   a.append(cap,title,arrow);list.append(a);
  });
  var notice=root.querySelector('[data-sebi-meaning]');
  if(notice)notice.textContent='Fetched entries confirm that SEBI listed these filing documents. Individual price bands, lot sizes, subscription levels and allotments have NOT been extracted or independently verified.';
 }
 var controller=typeof AbortController!=='undefined'?new AbortController():null;
 var rejectTimer=controller?setTimeout(function(){controller.abort()},8000):null;
 fetch('data/sebi-public-issue-filings.json',{cache:'no-store',signal:controller?controller.signal:undefined})
 .then(function(r){if(!r.ok)throw Error('Feed unavailable');return r.json()})
 .then(render).catch(function(){
  showState('Official feed not yet available or source collection failed. No values have been substituted.','v42-unavailable');
  var list=root.querySelector('[data-sebi-items]');if(list){
   var p=el('p','The current SEBI public issue filings should be checked directly at the regulator’s website. No automated IPO terms are displayed until an official index fetch succeeds.','v42-unavailable-copy');
   list.replaceChildren(p);
  }
 }).finally(function(){if(rejectTimer)clearTimeout(rejectTimer)});
})(window,document);
