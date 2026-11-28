/* Public campaign attribution: coarse UTM fields only, no click IDs or contact data. */
(function(w,d){'use strict';
const keys=['utm_source','utm_medium','utm_campaign'], limits=[32,32,48];
const clean=(v,i)=>String(v||'').toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,limits[i]);
const q=new URLSearchParams(w.location.search), data={};
keys.forEach((k,i)=>{const v=clean(q.get(k),i);if(v)data[k]=v});
const base='https://angel-research-conversion-v31.majian901104.workers.dev';
function decorate(a){try{const u=new URL(a.href,w.location.href);if(u.origin===w.location.origin&&/\.html$|\/$/.test(u.pathname)){if(/\/analytics-dashboard\.html$/.test(u.pathname))return;keys.forEach(k=>{if(data[k]&&!u.searchParams.has(k))u.searchParams.set(k,data[k])});a.href=u.href}else if(u.origin===base&&u.pathname==='/join'){keys.forEach((k,i)=>{if(data[k])u.searchParams.set(['s','m','c'][i],data[k])});a.href=u.href}}catch(e){}}
function init(){d.querySelectorAll('a[href]').forEach(decorate)}
d.addEventListener('click',e=>{const a=e.target?.closest?.('a[href]');if(a)decorate(a)},true);
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
w.AngelCampaign={get:k=>data[k]||'',decorate};
})(window,document);
