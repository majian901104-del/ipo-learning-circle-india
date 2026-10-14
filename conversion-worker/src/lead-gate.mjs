/* V3.7: WhatsApp pre-join name/phone registration. OFF until schema and privacy contact are ready. */
import {verifyAdminSession} from './admin-session.mjs';
import {dynamicPrimaryUrl} from './link-management.mjs';
const HOME='https://angelresearchindia.com';
const ORIGINS=new Set([HOME,'https://www.angelresearchindia.com','https://majian901104-del.github.io']);
const enc=new TextEncoder();
const HEADERS={'Cache-Control':'no-store,private','Referrer-Policy':'no-referrer',
'X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex,nofollow',
'Content-Security-Policy':"default-src 'none';style-src 'unsafe-inline';form-action 'self';base-uri 'none';frame-ancestors 'none'"};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const html=(value,status=200)=>new Response(value,{status,headers:{...HEADERS,'Content-Type':'text/html; charset=utf-8'}});
const json=(value,status=200,origin='')=>new Response(JSON.stringify(value),{status,headers:{...HEADERS,
'Content-Type':'application/json; charset=utf-8','Vary':'Origin',
...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{})}});
const safe=(s,max)=>String(s||'').toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,max)||'direct';
const b64=u=>btoa(String.fromCharCode(...u)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function signature(secret,body){
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return b64(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode('angel-v37-lead|'+body))));
}
const goodSecret=e=>typeof e.LINK_ADMIN_KEY==='string'&&e.LINK_ADMIN_KEY.length>=32;
async function tokenNew(env){
 const t=Math.floor(Date.now()/1000).toString(36),n=Array.from(crypto.getRandomValues(new Uint8Array(20)),x=>x.toString(16).padStart(2,'0')).join('');
 const payload='l37.'+t+'.'+n;
 return payload+'.'+await signature(env.LINK_ADMIN_KEY,payload);
}
async function tokenNonce(token,env){
 if(typeof token!=='string'||token.length>180||!goodSecret(env))return null;
 const parts=token.split('.');
 if(parts.length!==4||parts[0]!=='l37'||!/^[0-9a-z]{6,10}$/.test(parts[1])||!/^[a-f0-9]{40}$/.test(parts[2]))return null;
 const t=parseInt(parts[1],36),now=Math.floor(Date.now()/1000);
 if(!Number.isInteger(t)||t>now+30||t<now-1200)return null;
 const expected=await signature(env.LINK_ADMIN_KEY,parts.slice(0,3).join('.'));
 const a=enc.encode(expected),b=enc.encode(parts[3]);
 if(a.length!==b.length)return null;let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
 return diff===0?parts[2]:null;
}
const campaign=url=>({source:safe(url.searchParams.get('s')||url.searchParams.get('utm_source'),32),
 campaign:safe(url.searchParams.get('c')||url.searchParams.get('utm_campaign'),48),
 medium:safe(url.searchParams.get('m')||url.searchParams.get('utm_medium'),32)});
const validName=s=>{
 if(typeof s!=='string')return null;
 s=s.normalize('NFC').replace(/\s+/g,' ').trim();
 return s.length>=2&&s.length<=80&&!/[\p{C}<>]/u.test(s)?s:null
};
const validPhone=s=>typeof s==='string'&&/^[6-9][0-9]{9}$/.test(s.trim())?'+91'+s.trim():null;
async function storage(env){
 if(!env.LINK_DB||!goodSecret(env))return false;
 try{await env.LINK_DB.prepare('SELECT id FROM community_leads LIMIT 1').first();return true}catch(_e){return false}
}
function render({formToken='',data={},message='',unavailable=false}={}){
 const qs=new URLSearchParams({s:data.source||'direct',c:data.campaign||'direct',m:data.medium||'direct'}).toString();
 const notice=message?'<p class="error" role="alert">'+esc(message)+'</p>':'';
 const form=unavailable?'<p class="error" role="alert">Community registration is temporarily unavailable. Please try again later.</p>':
 '<form action="/join?'+esc(qs)+'" method="POST" autocomplete="on">'+
 '<input type="hidden" name="request_token" value="'+esc(formToken)+'">'+
 '<label for="name">Full name *</label>'+
 '<input id="name" name="full_name" type="text" required minlength="2" maxlength="80" autocomplete="name" placeholder="Enter your full name">'+
 '<label for="phone">WhatsApp mobile number *</label>'+
 '<div class="phone"><span>+91</span><input id="phone" name="whatsapp" type="tel" inputmode="numeric" autocomplete="tel-national" required pattern="[6-9][0-9]{9}" minlength="10" maxlength="10" placeholder="10-digit mobile number"></div>'+
 '<small>Indian number only. Enter 10 digits beginning with 6, 7, 8 or 9; do not repeat +91.</small>'+
 '<label class="check"><input type="checkbox" name="consent" value="yes" required><span>I agree to provide these details for my community invitation as explained in the <a href="'+HOME+'/privacy.html" target="_blank" rel="noopener noreferrer">Privacy Notice</a>. This is not an investment account application.</span></label>'+
 '<label class="check"><input type="checkbox" name="updates_opt_in" value="yes"><span>Optional: I would like to receive IPO and market research updates via WhatsApp. I can withdraw my consent.</span></label>'+
 '<div class="honeypot" aria-hidden="true"><label>Leave blank<input name="website" tabindex="-1" autocomplete="off"></label></div>'+
 '<button type="submit">SUBMIT &amp; OPEN WHATSAPP →</button>'+
 '<p class="note">Your phone number and name are never placed in the WhatsApp URL. Submitting does not guarantee group admission. We never request banking passwords, trading credentials or OTPs. For privacy requests, data deletion or withdrawing updates consent, email <a href="mailto:support@angelresearchindia.com">support@angelresearchindia.com</a>.</p>'+
 '</form>';
 const doc='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<meta name="theme-color" content="#0b2938"><title>Community Invitation | Angel Research</title>'+
 '<style>:root{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#163748;background:#edf3f6}*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:clamp(18px,4vw,52px) 16px}main{max-width:930px;margin:auto;display:grid;grid-template-columns:.85fr 1.15fr;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 20px 65px #103b4b20;border:1px solid #d5e1e7}aside{background:#0b2b3c;color:#f3fafc;padding:44px 35px}aside .brand{color:#e5c698;font-weight:850;letter-spacing:.13em;font-size:13px}h1{font-size:34px;line-height:1.16;margin:42px 0 18px}aside p{font-size:15px;color:#c3d7e0;line-height:1.75}article{padding:40px 42px}h2{font-size:25px;line-height:1.25;margin:0 0 8px}article>p{color:#687e8d;line-height:1.6;font-size:14px}label:not(.check){display:block;font-size:13px;font-weight:800;margin:21px 0 8px}input[type=text],input[type=tel]{width:100%;font:inherit;font-size:16px;border:1px solid #b9cdd7;border-radius:6px;min-height:51px;padding:12px 14px}input:focus-visible,button:focus-visible,a:focus-visible{outline:2px solid #14876f;outline-offset:3px}.phone{display:flex;align-items:center;border:1px solid #b9cdd7;border-radius:6px}.phone span{background:#edf3f6;padding:14px 13px;font-weight:800;color:#22546c}.phone input{border:0;min-width:0}small{display:block;font-size:12px;color:#61798a;margin:7px 0;line-height:1.5}.check{display:flex;gap:10px;margin-top:21px;font-size:13px;line-height:1.6;color:#405b6c;align-items:start}.check input{margin-top:4px;min-width:18px;min-height:18px}.check a{color:#086d76}.honeypot{position:absolute;left:-9999px;opacity:0;pointer-events:none}button{width:100%;margin-top:22px;border:0;border-radius:7px;min-height:54px;background:#0b7c69;color:#fff;font:inherit;font-size:15px;font-weight:800;cursor:pointer}button:hover{background:#086454}.note{font-size:12px;color:#657c89;line-height:1.65;margin-top:15px}.error{padding:13px;background:#fff0eb;border-left:3px solid #c65a38;color:#9f3b26;margin:17px 0}footer{text-align:center;margin:23px auto;font-size:12px;color:#6c8292}footer a{color:#1d647e}@media(max-width:700px){main{grid-template-columns:1fr}aside{padding:24px}h1{font-size:27px;margin:20px 0 12px}article{padding:25px 21px}}</style></head><body>'+
 '<main><aside><div class="brand">AR · ANGEL RESEARCH</div><h1>Join the market learning community.</h1><p>Complete a short registration to receive your WhatsApp group invitation.</p><p>Indian stock markets · IPO education · independent community</p></aside>'+
 '<article><h2>Your WhatsApp invitation</h2><p>Two required fields. No investment account is created and no investment returns are promised.</p>'+notice+form+'</article></main>'+
 '<footer>ANGEL RESEARCH · <a href="'+HOME+'/privacy.html">Privacy</a> · <a href="'+HOME+'/terms.html">Terms</a> · <a href="mailto:support@angelresearchindia.com">Privacy &amp; support</a> · Securities involve risk.</footer></body></html>';
 return html(doc,unavailable?503:message?400:200);
}
export async function handleLeadGate(request,env,record){
 const url=new URL(request.url);
 if(url.pathname!=='/join'||env.JOIN_LEAD_FORM_ENABLED!=='true'||env.LINK_MODE_ENABLED==='true')return null;
 if(!['GET','POST'].includes(request.method))return new Response(null,{status:405,headers:{...HEADERS,Allow:'GET,POST'}});
 const meta=campaign(url);
 if(!await storage(env))return render({unavailable:true});
 let destination;try{destination=await dynamicPrimaryUrl(env)}catch(_e){}
 if(!destination)return render({unavailable:true});
 if(request.method==='GET'){
  const mode=request.headers.get('Sec-Fetch-Mode');
  if(mode&&mode!=='navigate')return new Response('Navigation only',{status:403,headers:HEADERS});
  return render({formToken:await tokenNew(env),data:meta});
 }
 // A browser may send Origin: null for a form submitted from a page served
 // with Referrer-Policy: no-referrer (or privacy-enhanced browser settings).
 // Do not reject that legitimate case: signed, short-lived, one-time form
 // tokens are verified below. Still block explicit cross-site form attempts.
 const origin=request.headers.get('Origin');
 const fetchSite=request.headers.get('Sec-Fetch-Site');
 if(fetchSite==='cross-site'||(origin&&origin!=='null'&&origin!==url.origin))
  return render({message:'Please open this form from the official invitation page.',data:meta,formToken:await tokenNew(env)});
 if(!/^application\/x-www-form-urlencoded(?:\s*;|$)/i.test(request.headers.get('Content-Type')||''))
  return render({message:'Invalid form format.',data:meta,formToken:await tokenNew(env)});
 if(Number(request.headers.get('Content-Length')||0)>4096)return render({message:'Form is too large.',data:meta,formToken:await tokenNew(env)});
 let body;try{const raw=await request.text();if(raw.length>4096)throw Error('large');body=new URLSearchParams(raw)}catch(_e){
  return render({message:'Invalid form details.',data:meta,formToken:await tokenNew(env)})
 }
 if(body.get('website'))return render({message:'Invalid form details.',data:meta,formToken:await tokenNew(env)});
 const nonce=await tokenNonce(body.get('request_token'),env);
 if(!nonce)return render({message:'Your form has expired. Please use this new form.',data:meta,formToken:await tokenNew(env)});
 const name=validName(body.get('full_name')),phone=validPhone(body.get('whatsapp'));
 if(!name||!phone||body.get('consent')!=='yes')return render({message:'Enter a valid name, 10-digit Indian mobile number and required consent.',data:meta,formToken:await tokenNew(env)});
 let result;try{
  result=await env.LINK_DB.prepare('INSERT OR IGNORE INTO community_leads(request_nonce,full_name,whatsapp_number,source,campaign,medium,updates_opt_in,created_at) VALUES(?,?,?,?,?,?,?,?)')
   .bind(nonce,name,phone,meta.source,meta.campaign,meta.medium,body.get('updates_opt_in')==='yes'?1:0,Math.floor(Date.now()/1000)).run();
 }catch(_e){return render({unavailable:true})}
 if(result?.meta?.changes!==1)return render({message:'This form was already processed. Please request a new invitation form.',data:meta,formToken:await tokenNew(env)});
 if(typeof record==='function')await record(env,request,'join_click',{path:'/join',source:meta.source,campaign:meta.campaign,medium:meta.medium});
 return new Response(null,{status:303,headers:{...HEADERS,'Location':destination}});
}
export async function handleLeadAdmin(request,env){
 const url=new URL(request.url),p=url.pathname;
 if(p!=='/admin/leads'&&!/^\/admin\/leads\/[1-9][0-9]{0,11}$/.test(p))return null;
 const origin=request.headers.get('Origin')||'';
 if(!ORIGINS.has(origin))return json({ok:false,error:'origin_denied'},403,origin);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...HEADERS,'Access-Control-Allow-Origin':origin,'Vary':'Origin',
 'Access-Control-Allow-Methods':'GET,DELETE,OPTIONS','Access-Control-Allow-Headers':'Authorization'}});
 if(!await verifyAdminSession(request,env))return json({ok:false,error:'unauthorized'},401,origin);
 if(!await storage(env))return json({ok:false,error:'lead_storage_not_ready'},503,origin);
 if(p==='/admin/leads'&&request.method==='GET'){
  const before=url.searchParams.get('before')||'';
  if(before&&!/^[1-9][0-9]{0,11}$/.test(before))return json({ok:false,error:'invalid_cursor'},400,origin);
  try{
   const q='SELECT id,full_name,whatsapp_number,source,campaign,medium,updates_opt_in,created_at FROM community_leads';
   const rows=before?
    await env.LINK_DB.prepare(q+' WHERE id < ? ORDER BY id DESC LIMIT 51').bind(Number(before)).all():
    await env.LINK_DB.prepare(q+' ORDER BY id DESC LIMIT 51').all();
   const items=rows?.results||[],shown=items.slice(0,50);
   return json({ok:true,leads:shown,nextBefore:items.length>50?shown[shown.length-1].id:null,retentionDays:90},200,origin);
  }catch(_e){return json({ok:false,error:'lead_storage_unavailable'},503,origin)}
 }
 if(request.method==='DELETE'){
  try{
   const id=Number(p.slice('/admin/leads/'.length));
   const result=await env.LINK_DB.prepare('DELETE FROM community_leads WHERE id=?').bind(id).run();
   return json({ok:true,deleted:result?.meta?.changes===1},200,origin);
  }catch(_e){return json({ok:false,error:'delete_unavailable'},503,origin)}
 }
 return json({ok:false,error:'method'},405,origin);
}
