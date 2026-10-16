/* V4.2.1 — Public exchange crosscheck status, no exchange website scraping. */
(function(window,document){
'use strict';
var root=document.querySelector('[data-exchange-crosscheck]'),C=window.AngelIPOCrosscheck,m=window.AngelIPOData;
if(!root||!C||!m)return;
function element(tag,content,cls){var e=document.createElement(tag);if(cls)e.className=cls;if(content!==undefined)e.textContent=content;return e}
function cell(parent,title,text,clz){
 var x=element('div',undefined,'v421-field '+(clz||''));x.append(element('strong',title),element('span',text));parent.append(x);
}
function load(path){return fetch(path,{cache:'no-store'}).then(function(r){if(!r.ok)throw Error('source-load-'+r.status);return r.json()})}
function render(exchange,sebi,registry){
 var summary=root.querySelector('[data-exchange-summary]');
 var status=root.querySelector('[data-exchange-status]');
 var list=root.querySelector('[data-exchange-items]');if(!list)return;
 var report=C.build(m.issues,exchange.records,sebi,Date.now(),registry);
 if(summary)summary.textContent=report.issueCount+' IPO records · '+report.rows.filter(function(x){return x.filingIndexed}).length+' matched SEBI filing(s) · '+report.verifiedFields+' independently matched price/date/lot fields';
 if(status)status.textContent=report.hasLicensedExchangeData?'Authorized data supplied; field-by-field reconciliation active.':'No licensed NSE/BSE feed connected. Existing reported issue terms remain editorial information, not independently exchange-verified.';
 list.replaceChildren();
 report.rows.forEach(function(row){
   var card=element('article',undefined,'v421-company');
   var head=element('div',undefined,'v421-company-head');
   head.append(element('h3',row.name));
   head.append(element('span',row.filingIndexed?'SEBI DOCUMENT FOUND':'SEBI DOCUMENT NOT MATCHED',row.filingIndexed?'v421-sebi':'v421-pending'));
   card.append(head);
   var grid=element('div',undefined,'v421-fields');
   var labels={low:'PRICE FLOOR',high:'PRICE CEILING',lot:'RETAIL LOT',open:'OFFER OPENS',close:'OFFER CLOSES',subscriptionTimes:'SUBSCRIPTION',listingPrice:'LISTING PRICE'};
   C.fields.forEach(function(k){
     var v=row.fields[k],statusName=v.status==='verified'?'Two sources agree':v.status==='conflict'?'Conflicting data':v.status==='single-source'?'One licensed source':'Not verified';
     // Show numeric values only when two separately licensed sources agree.
     var label=statusName+(v.status==='verified'?' · '+String(v.value):'');
     cell(grid,labels[k],label,'v421-'+v.status);
   });
   card.append(grid);
   var bar=element('div',undefined,'v421-evidence-links');
   row.filings.forEach(function(doc){
     var a=element('a','SEBI '+doc.documentType.toUpperCase()+' · '+doc.filingDate+' ↗');
     a.href=doc.url;a.rel='noopener noreferrer';a.target='_blank';bar.append(a);
   });
   if(!row.filings.length)bar.append(element('span','No exact SEBI filing match. Check the regulator’s original index.'));
   if(row.rejected.length)bar.append(element('span',row.rejected.length+' submitted source(s) excluded by policy.'));
   card.append(bar);list.append(card);
 });
}
Promise.all([load('data/approved-exchange-snapshots.json'),load('data/sebi-public-issue-filings.json'),load('data/approved-exchange-providers.json')])
 .then(function(files){
  if(files[0].schemaVersion!=='4.2.1'||files[1].schemaVersion!=='4.2'||files[2].schemaVersion!=='4.2.1')throw Error('schema-version');
  if(!Array.isArray(files[0].records)||!Array.isArray(files[2].providers))throw Error('unrecognized-input');
  render(files[0],files[1],files[2]);
 }).catch(function(){
  var text='Source verification unavailable. No exchange terms can be treated as confirmed.';
  var s=root.querySelector('[data-exchange-status]');if(s)s.textContent=text;
  var l=root.querySelector('[data-exchange-items]');if(l)l.replaceChildren(element('p',text));
 });
})(window,document);
