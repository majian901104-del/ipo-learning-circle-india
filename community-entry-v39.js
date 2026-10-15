/* V3.9: Always preserve consent-first signup to Cloudflare /join.
 * This is public campaign metadata only, not authentication of referrer.
 * Browser JS can enrich links; HTML already has the working Worker fallback.
 */
(function(w,d){
 'use strict';
 var worker='https://angel-research-conversion-v31.majian901104.workers.dev';
 var query=new URLSearchParams(w.location.search);
 function safe(v,len){return String(v||'').toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,len)||'direct'}
 var src=safe(query.get('utm_source')||query.get('source'),32);
 var campaign=safe(query.get('utm_campaign')||query.get('campaign'),48);
 var medium=safe(query.get('utm_medium'),32);
 function init(){
  d.querySelectorAll('a[data-conversion-join]').forEach(function(a){
   try{
    var dest=new URL(worker+'/join');
    dest.searchParams.set('s',src);dest.searchParams.set('c',campaign);dest.searchParams.set('m',medium);
    a.href=dest.href;a.rel='noopener noreferrer';
    a.setAttribute('aria-label',a.textContent.trim()+' — opens community registration');
   }catch(_e){}
  });
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
