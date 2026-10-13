/* Angel Research V3.1 conversion instrumentation.
 * Independent, cookieless, aggregate-only Worker endpoint (when configured).
 * Not a GA4 replacement. No per-visitor IDs, PII, session linking, or fingerprinting.
 * Explicit analytics rejection, DNT/GPC or unavailable endpoint => no event sent.
 * All external community links continue to work without the Worker.
 */
(function(w,d){
'use strict';
var cfg=w.AngelConversionConfig||{};
var raw=typeof cfg.workerBase==='string'?cfg.workerBase.trim().replace(/\/+$/,''):'';
var backend=null;
try{
  var candidate=new URL(raw);
  if(cfg.enabled===true && candidate.protocol==='https:' &&
     !candidate.username&&!candidate.password&&!candidate.search&&!candidate.hash&&
     candidate.pathname==='/') backend=candidate.origin;
}catch(_err){}
var consentKey=cfg.analyticsConsentKey||'angelresearch_ga4_consent_v1';
function rejected(){
  try{if(w.localStorage.getItem(consentKey)==='denied')return true}catch(_err){}
  var nav=w.navigator||{};
  return nav.globalPrivacyControl===true||nav.doNotTrack==='1'||w.doNotTrack==='1';
}
function allowed(){
  if(!backend||rejected())return false;
  if(cfg.allowAnonymousAggregateWithoutChoice)return true;
  try{return w.localStorage.getItem(consentKey)==='granted'}catch(_e){return false}
}
function safe(value,max){
  var s=String(value||'').toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,max||45);
  return s||'direct';
}
function path(){
  var p=w.location.pathname;
  if(!/^\/[a-z0-9/_-]{0,110}(?:\.html)?$/i.test(p))return '/other';
  return p;
}
var qp=new URLSearchParams(w.location.search);
var campaign=safe(qp.get('utm_campaign')||'direct',48);
var source=safe(qp.get('utm_source')||'direct',32);
var medium=safe(qp.get('utm_medium')||'unspecified',32);
function eventPayload(type){
  return JSON.stringify({
    event:type,path:path(),campaign:campaign,source:source,medium:medium
  });
}
function ping(){
  if(!allowed())return;
  // Use only aggregate dimensions. Never include the user's full URL, query, IP, UA,
  // referrer path, personal information, or a persistent identifier.
  try{
    var uri=backend+'/collect',data=eventPayload('page_view');
    if(w.navigator&&typeof w.navigator.sendBeacon==='function'){
      var blob=new Blob([data],{type:'text/plain'});
      if(w.navigator.sendBeacon(uri,blob))return;
    }
    w.fetch(uri,{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'text/plain'},body:data,keepalive:true}).catch(function(){});
  }catch(_err){}
}
function instrument(){
  d.querySelectorAll('a[href]').forEach(function(a){
    var original=a.getAttribute('href')||'';
    if(!/^https:\/\/cc\.stockscode\.click\/?([?#].*)?$/i.test(original))return;
    a.setAttribute('data-conversion-join','true');
    // Links are changed only when a published independent redirect service exists.
    // Exiting to WhatsApp is always allowed if the user opts out.
    if(!allowed())return;
    var u=new URL(backend+'/join');
    u.searchParams.set('c',campaign);
    u.searchParams.set('s',source);
    u.searchParams.set('m',medium);
    a.href=u.href;
    a.target='_blank';
    a.rel='noopener noreferrer';
  });
}
function setup(){
  if(!backend)return;
  instrument();
  ping();
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',setup,{once:true});
else setup();
w.addEventListener('angel-analytics-choice',function(){
  // Re-evaluate links after a visitor changes consent.
  d.querySelectorAll('a[data-conversion-join]').forEach(function(a){
    a.href=cfg.destination||'https://cc.stockscode.click';
  });
  instrument();
});
w.AngelConversion={isConfigured:!!backend,eligible:allowed,visitRecorded:function(){return !!backend&&allowed()}};
})(window,document);
