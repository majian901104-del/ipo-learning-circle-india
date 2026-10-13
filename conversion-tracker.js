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
function sessionFlag(name){
  // Tab-lifetime booleans only: no visitor ID, fingerprint, cookie or server-side key.
  // More than one tab/browser can belong to one person, so counts are estimates.
  try{
    var key='angel_anon_session_v321_'+name+'_'+source+'_'+campaign;
    if(w.sessionStorage.getItem(key)==='1')return false;
    w.sessionStorage.setItem(key,'1');
    return true;
  }catch(_e){return false}
}
function deviceInfo(){
  // Generic classification; never send a complete User-Agent string.
  var ua=w.navigator?.userAgent||'';
  var isTablet=/iPad|Tablet|Android(?!.*Mobile)/i.test(ua);
  var isMobile=/iPhone|iPod|Android.*Mobile|Mobile/i.test(ua)||w.navigator?.userAgentData?.mobile===true;
  var dev=isTablet?'tablet':(isMobile?'mobile':'desktop');
  var os=/iPhone|iPad|iPod/i.test(ua)?'ios':/Android/i.test(ua)?'android':
    /Windows/i.test(ua)?'windows':/Mac OS/i.test(ua)?'macos':
    /Linux/i.test(ua)?'linux':'other';
  return {device:dev,os:os,model:'unknown'};
}
var device=deviceInfo();
var setupPending=false;
function allowModel(){
  try{return w.localStorage.getItem(consentKey)==='granted'}catch(_e){return false}
}
function loadModel(){
  if(!allowModel()||rejected()||!w.navigator?.userAgentData?.getHighEntropyValues)return Promise.resolve();
  // Browsers often do not expose a specific device model, especially Safari/iOS.
  return w.navigator.userAgentData.getHighEntropyValues(['model']).then(function(v){
    if(typeof v.model==='string'&&v.model.length>1){
      device.model=v.model.toLowerCase().replace(/[^a-z0-9._ -]/g,'').trim().slice(0,36)||'unknown';
    }
  }).catch(function(){});
}
function eventPayload(type,firstSession){
  return JSON.stringify({
    event:type,path:path(),campaign:campaign,source:source,medium:medium,
    firstSession:firstSession,device:device.device,os:device.os,model:device.model
  });
}
function ping(){
  if(!allowed())return;
  var first=sessionFlag('visit');
  try{
    var uri=backend+'/collect',data=eventPayload('page_view',first);
    if(w.navigator&&typeof w.navigator.sendBeacon==='function'){
      var blob=new Blob([data],{type:'text/plain'});
      if(w.navigator.sendBeacon(uri,blob))return;
    }
    w.fetch(uri,{method:'POST',mode:'cors',credentials:'omit',
      headers:{'Content-Type':'text/plain'},body:data,keepalive:true}).catch(function(){});
  }catch(_err){}
}
function rewriteLinks(){
  d.querySelectorAll('a[href],a[data-conversion-join]').forEach(function(a){
    var original=a.getAttribute('href')||'';
    if(!a.hasAttribute('data-conversion-join')&&!/^https:\/\/cc\.stockscode\.click\/?([?#].*)?$/i.test(original))return;
    a.setAttribute('data-conversion-join','true');
    if(!allowed()){
      a.href=cfg.destination||'https://cc.stockscode.click';
      return;
    }
    var u=new URL(backend+'/join');
    u.searchParams.set('c',campaign);u.searchParams.set('s',source);u.searchParams.set('m',medium);
    u.searchParams.set('d',device.device);u.searchParams.set('o',device.os);u.searchParams.set('model',device.model);
    a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';
  });
}
function instrument(){
  rewriteLinks();
  d.addEventListener('click',function(e){
    var a=e.target?.closest?.('a[data-conversion-join]');
    if(!a||!allowed())return;
    var link=new URL(a.href);
    if(link.origin!==backend||link.pathname!=='/join')return;
    // One redirect-session event per source/campaign per browser tab.
    link.searchParams.set('u',sessionFlag('join')?'1':'0');
    a.href=link.href;
  },true);
}
function setup(){
  if(!backend)return;
  if(setupPending)return;
  setupPending=true;
  loadModel().then(function(){instrument();ping();setupPending=false}).catch(function(){instrument();ping();setupPending=false});
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',setup,{once:true});
else setup();
w.addEventListener('angel-analytics-choice',function(){
  // Re-evaluate links after a visitor changes consent.
  d.querySelectorAll('a[data-conversion-join]').forEach(function(a){
    a.href=cfg.destination||'https://cc.stockscode.click';
  });
  rewriteLinks();
});
w.AngelConversion={isConfigured:!!backend,eligible:allowed,visitRecorded:function(){return !!backend&&allowed()}};
})(window,document);
