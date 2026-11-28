(function(){
'use strict';
if(document.getElementById('ar-ipo-popup'))return;
const key='ar_ipo_popup_seen_v1';
const style=document.createElement('style');
style.textContent=`
#ar-ipo-popup{box-sizing:border-box;width:min(460px,calc(100% - 24px));max-height:calc(100dvh - 24px);overflow:auto;padding:0;border:0;border-radius:14px;background:#fff;color:#17394a;box-shadow:0 20px 90px #0006;font:16px/1.5 Arial,sans-serif;z-index:100001}
#ar-ipo-popup *{box-sizing:border-box}#ar-ipo-popup::backdrop{background:#071b2599}
#ar-ipo-popup header{position:relative;background:#0b2431;color:white;padding:24px 26px 20px}
#ar-ipo-popup header small{color:#e3c58d;font-weight:bold;letter-spacing:.1em}
#ar-ipo-popup h2{color:white;font:700 27px/1.2 Arial;margin:12px 0 8px}
#ar-ipo-popup header p{color:#e0e9ed!important;margin:0;font-size:14px}
#ar-ipo-popup .ar-invite-content{padding:22px 26px;margin:0}#ar-ipo-float[hidden]{display:none!important}
#ar-ipo-popup label{display:block;font:700 14px/1.4 Arial;margin:0 0 7px;color:#17394a}
#ar-ipo-popup input:not([type=checkbox]),#ar-ipo-popup select{display:block;width:100%;min-height:45px;border:1px solid #b7c9d0;border-radius:6px;background:#fff;color:#17394a;font:16px Arial;padding:10px;margin:0 0 15px}
#ar-ipo-popup .ar-consent{display:flex;gap:9px;align-items:flex-start;font:13px/1.5 Arial;margin:8px 0 15px}
#ar-ipo-popup .ar-consent input{flex:none;width:18px;height:18px;margin:2px 0}
#ar-ipo-popup a{color:#174e69;text-decoration:underline}
#ar-ipo-popup .ar-submit,#ar-ipo-float,#ar-ipo-popup .ar-next{border:0;background:#146b47;color:white;font:700 15px/1.35 Arial;cursor:pointer;border-radius:8px;padding:14px;text-align:center}
#ar-ipo-popup .ar-submit,#ar-ipo-popup .ar-next{width:100%;display:block;text-decoration:none;color:#fff!important}
#ar-ipo-popup button:disabled{opacity:.6;cursor:wait}
#ar-ipo-popup .ar-close{position:absolute;right:9px;top:9px;width:36px;height:36px;border:0;background:transparent;color:white;font:26px Arial;cursor:pointer}
#ar-ipo-popup .ar-note{font:12px/1.5 Arial;color:#526875;text-align:center;margin:12px 0 0}
#ar-ipo-float{position:fixed;right:16px;bottom:18px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:90000;box-shadow:0 5px 20px #0003;display:flex;gap:8px;align-items:center;max-width:calc(100% - 32px);border-radius:40px;padding:12px 18px}
#ar-ipo-float svg{width:23px;height:23px;flex:none}
#ar-ipo-float:focus-visible,#ar-ipo-popup :focus-visible{outline:3px solid #bd923d;outline-offset:3px}
#ar-ipo-popup [hidden]{display:none!important}
body:has(#angel-consent-banner) #ar-ipo-float{bottom:180px}
@media(max-width:520px){#ar-ipo-popup header{padding:20px}#ar-ipo-popup .ar-invite-content{padding:18px 20px}#ar-ipo-popup h2{font-size:24px}#ar-ipo-float{font-size:13px;padding:10px 14px;right:12px}}
@media(prefers-reduced-motion:no-preference){
#ar-ipo-float{animation:ar-invite-pulse 2s ease-in-out infinite;transform-origin:center}
#ar-ipo-float:hover,#ar-ipo-float:focus-within{animation-play-state:paused}
@keyframes ar-invite-pulse{0%,100%{transform:scale(1);box-shadow:0 5px 20px #0003,0 0 0 0 rgba(20,107,71,.36)}50%{transform:scale(1.035);box-shadow:0 5px 20px #0003,0 0 0 12px rgba(20,107,71,0),0 0 22px rgba(20,107,71,.24)}}
}
@media(prefers-reduced-motion:reduce){#ar-ipo-float{animation:none!important;transform:none!important}}
#ar-ipo-float[hidden]{animation:none!important;display:none!important}
`;
document.head.appendChild(style);
const dialog=document.createElement('dialog');dialog.id='ar-ipo-popup';dialog.setAttribute('aria-labelledby','ar-ipo-title');
dialog.innerHTML=`<header><small>ANGEL RESEARCH</small><button type="button" class="ar-close" aria-label="Close invitation">×</button><h2 id="ar-ipo-title">Join India's Free IPO Community</h2><p>IPO research · Market insights · Investor education</p></header><div class="ar-invite-content"><p>Join our free educational community for Indian IPO calendars, research and market insights.</p><p>Complete one short registration on our community invitation page. Available to visitors in India.</p><a class="ar-next" rel="noopener noreferrer">CONTINUE TO FREE REGISTRATION →</a><p class="ar-note">Free to join. Education only; no guaranteed returns or allocations. <a href="/privacy.html">Privacy Notice</a></p></div>`;
document.body.appendChild(dialog);
const float=document.createElement('button');float.id='ar-ipo-float';float.type='button';float.setAttribute('aria-label','Open free IPO community invitation');float.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 11.5a9 9 0 0 1-9 9 9 9 0 0 1-4-.9L3 21l1.4-4.8a9 9 0 1 1 16.6-4.7Z"/><path d="M8 11h8M8 15h5"/></svg><span>Join Free IPO Group</span>';document.body.appendChild(float);
const next=dialog.querySelector('.ar-next');
const q=new URLSearchParams(location.search);
const dest=new URL('https://angel-research-conversion-v31.majian901104.workers.dev/join');
for(const [a,b] of [['s','utm_source'],['c','utm_campaign'],['m','utm_medium']])dest.searchParams.set(a,(q.get(b)||'direct').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,48));
next.href=dest.href;
let shown=false;
function mark(){shown=true;try{localStorage.setItem(key,String(Date.now()))}catch(e){}}
function recent(){try{return Date.now()-Number(localStorage.getItem(key)||0)<86400000}catch(e){return false}}
function open(){if(dialog.open)return;mark();dialog.showModal();float.hidden=true;try{window.AngelAnalytics?.track('ipo_invitation_open',{button_location:'homepage_popup'})}catch(e){}}
dialog.querySelector('.ar-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{float.hidden=false;float.focus({preventScroll:true})});
float.addEventListener('click',open);
function auto(){if(!shown&&!recent()&&!document.getElementById('angel-consent-banner')&&!document.querySelector('dialog[open]'))open()}
setTimeout(auto,3000);
window.addEventListener('angel-analytics-choice',()=>setTimeout(auto,3000));
next.addEventListener('click',()=>{try{window.AngelAnalytics?.track('ipo_invitation_click',{button_location:'ipo_popup_registration'})}catch(e){}});
})();
