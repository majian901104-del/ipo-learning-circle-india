(function(){
'use strict';
if(document.getElementById('ar-ipo-popup'))return;
const endpoint="https://script.google.com/macros/s/AKfycbzjF1oOfUZCxK90vPYeOy_bcYL_ubvTjCdMZRciwWoK7a6GnaXyj0XH51P6LhECSL0/exec";
const key='ar_ipo_popup_seen_v1';
const style=document.createElement('style');
style.textContent=`
#ar-ipo-popup{box-sizing:border-box;width:min(460px,calc(100% - 24px));max-height:calc(100dvh - 24px);overflow:auto;padding:0;border:0;border-radius:14px;background:#fff;color:#17394a;box-shadow:0 20px 90px #0006;font:16px/1.5 Arial,sans-serif;z-index:100001}
#ar-ipo-popup *{box-sizing:border-box}#ar-ipo-popup::backdrop{background:#071b2599}
#ar-ipo-popup header{position:relative;background:#0b2431;color:white;padding:24px 26px 20px}
#ar-ipo-popup header small{color:#e3c58d;font-weight:bold;letter-spacing:.1em}
#ar-ipo-popup h2{color:white;font:700 27px/1.2 Arial;margin:12px 0 8px}
#ar-ipo-popup header p{color:#e0e9ed;margin:0;font-size:14px}
#ar-ipo-popup form{padding:22px 26px;margin:0}
#ar-ipo-popup label{display:block;font:700 14px/1.4 Arial;margin:0 0 7px;color:#17394a}
#ar-ipo-popup input:not([type=checkbox]),#ar-ipo-popup select{display:block;width:100%;min-height:45px;border:1px solid #b7c9d0;border-radius:6px;background:#fff;color:#17394a;font:16px Arial;padding:10px;margin:0 0 15px}
#ar-ipo-popup .ar-consent{display:flex;gap:9px;align-items:flex-start;font:13px/1.5 Arial;margin:8px 0 15px}
#ar-ipo-popup .ar-consent input{flex:none;width:18px;height:18px;margin:2px 0}
#ar-ipo-popup a{color:#174e69;text-decoration:underline}
#ar-ipo-popup .ar-submit,#ar-ipo-float,#ar-ipo-popup .ar-next{border:0;background:#146b47;color:white;font:700 15px/1.35 Arial;cursor:pointer;border-radius:8px;padding:14px;text-align:center}
#ar-ipo-popup .ar-submit,#ar-ipo-popup .ar-next{width:100%;display:block;text-decoration:none}
#ar-ipo-popup button:disabled{opacity:.6;cursor:wait}
#ar-ipo-popup .ar-close{position:absolute;right:9px;top:9px;width:36px;height:36px;border:0;background:transparent;color:white;font:26px Arial;cursor:pointer}
#ar-ipo-popup .ar-note{font:12px/1.5 Arial;color:#526875;text-align:center;margin:12px 0 0}
#ar-ipo-float{position:fixed;right:16px;bottom:18px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:90000;box-shadow:0 5px 20px #0003;display:flex;gap:8px;align-items:center;max-width:calc(100% - 32px);border-radius:40px;padding:12px 18px}
#ar-ipo-float svg{width:23px;height:23px;flex:none}
#ar-ipo-float:focus-visible,#ar-ipo-popup :focus-visible{outline:3px solid #bd923d;outline-offset:3px}
#ar-ipo-popup [hidden]{display:none!important}
body:has(#angel-consent-banner) #ar-ipo-float{bottom:180px}
@media(max-width:520px){#ar-ipo-popup header{padding:20px}#ar-ipo-popup form{padding:18px 20px}#ar-ipo-popup h2{font-size:24px}#ar-ipo-float{font-size:13px;padding:10px 14px;right:12px}}
@media(prefers-reduced-motion:no-preference){#ar-ipo-float{animation:ar-invite-pulse 3s ease-in-out 3}@keyframes ar-invite-pulse{50%{box-shadow:0 0 0 5px #146b4726}}}
`;
document.head.appendChild(style);
const dialog=document.createElement('dialog');dialog.id='ar-ipo-popup';dialog.setAttribute('aria-labelledby','ar-ipo-title');
dialog.innerHTML=`<header><small>ANGEL RESEARCH</small><button type="button" class="ar-close" aria-label="Close invitation">×</button><h2 id="ar-ipo-title">Join India's Free IPO Community</h2><p>IPO research · Market insights · Investor education</p></header><form><label for="ar-ipo-name">Full name</label><input id="ar-ipo-name" name="full_name" autocomplete="name" minlength="2" maxlength="80" required><label for="ar-ipo-age">Age range</label><select id="ar-ipo-age" name="age_range" required><option value="">Select your age range</option><option>25–34</option><option>35–44</option><option>45–54</option><option>55+</option></select><label for="ar-ipo-phone">WhatsApp number (+91)</label><input id="ar-ipo-phone" name="whatsapp" type="tel" autocomplete="tel" inputmode="tel" placeholder="+91 98765 43210" maxlength="20" required><label class="ar-consent"><input type="checkbox" name="consent" value="Yes" required><span>I consent to storing my details for community registration and being contacted on WhatsApp about it. Read the <a href="/privacy.html" target="_blank" rel="noopener">Privacy Notice</a>. Other group members may see my phone number if I join.</span></label><input type="hidden" name="form_key" value="ipo-desk-v1"><input type="hidden" name="source_page" value="IPO Community Popup"><input type="hidden" name="ipo_interest" value="All IPOs"><div hidden><input name="website" tabindex="-1" autocomplete="off"></div><button type="submit" class="ar-submit">JOIN FREE WHATSAPP COMMUNITY →</button><p class="ar-note">Free to join. Education only; no guaranteed returns or allocations.</p><p role="status" aria-live="polite" class="ar-status"></p><a class="ar-next" hidden>OPEN WHATSAPP INVITATION →</a></form>`;
document.body.appendChild(dialog);
const float=document.createElement('button');float.id='ar-ipo-float';float.type='button';float.setAttribute('aria-label','Open free IPO community invitation');float.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 11.5a9 9 0 0 1-9 9 9 9 0 0 1-4-.9L3 21l1.4-4.8a9 9 0 1 1 16.6-4.7Z"/><path d="M8 11h8M8 15h5"/></svg><span>Join Free IPO Group</span>';document.body.appendChild(float);
const form=dialog.querySelector('form'),submit=form.querySelector('.ar-submit'),status=form.querySelector('.ar-status'),next=form.querySelector('.ar-next');
let shown=false,sending=false,registered=false;
function mark(){shown=true;try{localStorage.setItem(key,String(Date.now()))}catch(e){}}
function recent(){try{return Date.now()-Number(localStorage.getItem(key)||0)<86400000}catch(e){return false}}
function open(){if(dialog.open)return;mark();dialog.showModal();float.hidden=true;}
dialog.querySelector('.ar-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{float.hidden=false;float.focus({preventScroll:true})});
float.addEventListener('click',open);
setTimeout(()=>{if(!shown&&!recent()&&!document.getElementById('angel-consent-banner')&&!document.querySelector('dialog[open]'))open()},3000);
window.addEventListener('angel-analytics-choice',()=>{if(!shown&&!recent())setTimeout(()=>{if(!shown&&!recent()&&!dialog.open)open()},3000)});
form.elements.whatsapp.addEventListener('input',()=>form.elements.whatsapp.setCustomValidity(''));
form.addEventListener('submit',async e=>{
 e.preventDefault();if(sending||registered)return;
 const phone=form.elements.whatsapp;let digits=phone.value.replace(/\D/g,'');if(digits.length===10)digits='91'+digits;
 if(!/^91[6-9]\d{9}$/.test(digits)){phone.setCustomValidity('Enter a valid Indian mobile number.');phone.reportValidity();return}
 phone.value='+'+digits;const body=new URLSearchParams(new FormData(form));const q=new URLSearchParams(location.search);
 for(const k of ['utm_source','utm_campaign'])body.set(k,(q.get(k)||'').slice(0,120));
 sending=true;submit.disabled=true;status.textContent='Confirming your registration…';const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),20000);
 try{
  const response=await fetch(endpoint,{method:'POST',body,signal:ctrl.signal,redirect:'follow'});
  if(!response.ok)throw Error('network');const result=await response.json();if(result.ok!==true)throw Error('unconfirmed');
  registered=true;status.textContent='Registration received. Open the WhatsApp invitation below.';
  const dest=new URL('https://angel-research-conversion-v31.majian901104.workers.dev/join');
  for(const [a,b] of [['s','utm_source'],['c','utm_campaign'],['m','utm_medium']])dest.searchParams.set(a,(q.get(b)||'direct').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,48));
  next.href=dest.href;next.hidden=false;submit.hidden=true;
  if(!result.duplicate)try{window.AngelAnalytics?.track('generate_lead',{lead_type:'ipo_community_popup'})}catch(e){}
  next.focus();
 }catch(e){status.textContent='Registration not confirmed. Please try again later.';submit.disabled=false}
 finally{clearTimeout(timer);sending=false}
});
next.addEventListener('click',()=>{try{window.AngelAnalytics?.track('join_community_click',{button_location:'ipo_popup_confirmed',destination_type:'community_link'})}catch(e){}});
})();