/* V3.4 client gate; remains disabled until v34Protected=true. */
(function(w,d){
'use strict';
const cfg=w.AngelConversionConfig||{};
if(cfg.v34Protected!==true)return;
const base=String(cfg.workerBase||'').replace(/\/+$/,'');
if(!/^https:\/\/[^/]+$/.test(base))return;
let token='';
try{
 const u=new URL(w.location.href),v=u.searchParams.get('admission')||'';
 if(/^[a-f0-9]{48}$/.test(v)){
  w.sessionStorage.setItem('angel_community_grant_v34',v);
  u.searchParams.delete('admission');
  w.history.replaceState(null,'',u.pathname+u.search+u.hash);
 }
 token=w.sessionStorage.getItem('angel_community_grant_v34')||'';
}catch(_e){}
function applyGate(){
 const valid=/^[a-f0-9]{48}$/.test(token);
 const links=d.querySelectorAll('a[data-conversion-join],a[href^="https://angel-research-conversion-v31.majian901104.workers.dev/join"]');
 for(const a of links){
  a.dataset.conversionJoin='true';
  a.href=valid?base+'/join?admission='+encodeURIComponent(token):'#community-invitation';
  a.setAttribute('aria-disabled',valid?'false':'true');
  a.removeAttribute('target');a.removeAttribute('rel');
  if(!valid)a.title='WhatsApp invitation is available to eligible visitors arriving from supported social campaigns in India';
 }
}
d.addEventListener('click',event=>{
 const a=event.target?.closest?.('a[data-conversion-join]');
 if(a&&!/^[a-f0-9]{48}$/.test(token))event.preventDefault();
},true);
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',applyGate,{once:true});else applyGate();
})(window,document);
