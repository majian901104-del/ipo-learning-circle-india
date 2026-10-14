/* V3.3 client-only gate display. Server is the sole authority for admissions.
 * The original WhatsApp destination must never appear in HTML, JS or public config. */
(function(w,d){
'use strict';
const cfg=w.AngelConversionConfig||{};
if(cfg.v33Enabled!==true)return;
const worker=String(cfg.workerBase||'').replace(/\/+$/,'');
let token='';
try{
 const u=new URL(w.location.href),p=u.searchParams.get('admission');
 if(p&&/^[a-f0-9]{48}$/.test(p)){
  w.sessionStorage.setItem('ari_v33_admission',p);
  u.searchParams.delete('admission');
  w.history.replaceState(null,'',u.pathname+u.search+u.hash);
 }
 token=w.sessionStorage.getItem('ari_v33_admission')||'';
}catch(_e){token=''}
function enable(){
 const found=d.querySelectorAll('a[data-conversion-join]');
 found.forEach(a=>{
  const good=/^[a-f0-9]{48}$/.test(token);
  a.href=good?worker+'/join?admission='+encodeURIComponent(token):'#community-invitation';
  a.setAttribute('aria-disabled',good?'false':'true');
  a.removeAttribute('target');
  a.removeAttribute('rel');
  if(!good){
   a.setAttribute('title','This invitation is available only through an eligible social campaign in India.');
   a.classList.add('join-restricted');
  }
 });
 let note=d.getElementById('v33-community-notice');
 if(!note&&found.length){
  note=d.createElement('p');note.id='v33-community-notice';
  note.style.cssText='font-size:13px;color:#6b7785;margin:12px auto;max-width:620px;text-align:center';
  found[0].insertAdjacentElement('afterend',note);
 }
 if(note)note.textContent=token?'Invitation access granted for this session. Link expires after 15 minutes and can only be used once.':'Community invitation is available to eligible visitors arriving from X, Facebook, Instagram or YouTube in India.';
}
d.addEventListener('click',e=>{
 const a=e.target?.closest?.('a[data-conversion-join]');
 if(a&&!/^[a-f0-9]{48}$/.test(token)){e.preventDefault();return;}
},true);
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',enable,{once:true});else enable();
})(window,document);
