/* Central public campaign classification. No raw click IDs, referrer URLs or contact fields retained. */
(function(w,d){'use strict';
const keys=['utm_source','utm_medium','utm_campaign'],limits=[32,32,48];
const clean=(v,i)=>String(v||'').toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,limits[i]);
const q=new URLSearchParams(w.location.search), data={};
const blocked=()=>{try{return w.navigator?.globalPrivacyControl===true||w.navigator?.doNotTrack==='1'||w.doNotTrack==='1'||w.localStorage.getItem('angelresearch_ga4_consent_v1')==='denied'}catch(e){return true}};
function hostSource(host){
 const h=host.toLowerCase(),match=n=>h===n||h.endsWith('.'+n);
 if(match('youtube.com')||match('youtu.be'))return ['youtube','referral'];
 if(match('instagram.com'))return ['instagram','referral'];
 if(match('facebook.com')||match('fb.com'))return ['facebook','referral'];
 if(match('x.com')||match('twitter.com')||match('t.co'))return ['x','referral'];
 if(match('linkedin.com')||match('lnkd.in'))return ['linkedin','referral'];
 if(match('tiktok.com'))return ['tiktok','referral'];
 if(match('bing.com'))return ['bing','search_referral'];
 if(/^([a-z0-9-]+\.)*google\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(h))return ['google_search','search_referral'];
 return null;
}
function identify(){
 keys.forEach(k=>delete data[k]);
 keys.forEach((k,i)=>{const v=clean(q.get(k),i);if(v)data[k]=v});
 if(blocked())return;
 if(!data.utm_source){
  let found=null;
  if(['gclid','gbraid','wbraid'].some(k=>!!q.get(k)))found=['google_ads','cpc'];
  else if(q.get('fbclid'))found=['meta','click_referral'];
  else if(q.get('msclkid'))found=['microsoft_ads','cpc'];
  else if(q.get('ttclid'))found=['tiktok_ads','cpc'];
  else if(q.get('twclid'))found=['x_ads','cpc'];
  else try{const r=new URL(d.referrer);if(r.origin!==w.location.origin)found=hostSource(r.hostname)}catch(e){}
  if(found){data.utm_source=found[0];if(!data.utm_medium)data.utm_medium=found[1]}
 }
 if(data.utm_source&&!data.utm_campaign)data.utm_campaign='unknown';
}
identify();
const base='https://angel-research-conversion-v31.majian901104.workers.dev';
function decorate(a){try{const u=new URL(a.href,w.location.href);if(u.origin===w.location.origin&&/\.html$|\/$/.test(u.pathname)){if(/\/(?:analytics-dashboard|privacy|terms)\.html$/.test(u.pathname))return;keys.forEach(k=>{if(data[k]&&!u.searchParams.has(k))u.searchParams.set(k,data[k])});a.href=u.href}else if(u.origin===base&&u.pathname==='/join'){keys.forEach((k,i)=>{if(data[k])u.searchParams.set(['s','m','c'][i],data[k])});a.href=u.href}}catch(e){}}
function init(){d.querySelectorAll('a[href]').forEach(decorate)}
d.addEventListener('click',e=>{const a=e.target?.closest?.('a[href]');if(a)decorate(a)},true);
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
w.AngelCampaign={get:k=>data[k]||'',decorate};
})(window,document);
