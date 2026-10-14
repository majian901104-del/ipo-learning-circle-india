/* V3.5 single owner login: reuse existing LINK_ADMIN_KEY, no new password.
 * A short-lived HMAC-authenticated bearer token grants report + link scopes.
 * Tokens exist only in tab memory; no cookie, localStorage, tracking identifier,
 * or account identity is persisted. Legacy secrets stay valid for rollback.
 * For MFA and staff-level RBAC, move this gateway behind Cloudflare Access later.
 */
const ORIGINS=new Set(['https://angelresearchindia.com','https://www.angelresearchindia.com','https://majian901104-del.github.io']);
const TTL_SECONDS=60*60*4;
const enc=new TextEncoder();
const headerValue=(v)=>typeof v==='string'?v:'';
const cors=(origin)=>({'Cache-Control':'no-store,private','Pragma':'no-cache','Vary':'Origin',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
 ...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{})});
const response=(body,status,origin)=>new Response(JSON.stringify(body),{status,headers:{
 ...cors(origin),'Content-Type':'application/json;charset=utf-8'}});
const b64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const fromB64=s=>{
 if(!/^[A-Za-z0-9_-]{4,384}$/.test(s))throw Error('invalid_base64');
 const x=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));
 return Uint8Array.from(x,c=>c.charCodeAt(0));
};
async function signingKey(secret){
 if(typeof secret!=='string'||secret.length<32||secret.length>4096)throw Error('missing_secret');
 // Purpose binding makes an unrelated HMAC signed with the same secret unusable here.
 return crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
async function constantMatch(a,b){
 if(typeof a!=='string'||a.length<32||a.length>1024||typeof b!=='string'||b.length<32)return false;
 const [x,y]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(a)),crypto.subtle.digest('SHA-256',enc.encode(b))]);
 const u=new Uint8Array(x),v=new Uint8Array(y);let n=0;for(let i=0;i<u.length;i++)n|=u[i]^v[i];return n===0;
}
async function issue(secret,now=Math.floor(Date.now()/1000)){
 const payload={v:1,role:'owner',iat:now,exp:now+TTL_SECONDS,jti:b64url(crypto.getRandomValues(new Uint8Array(16)))};
 const body=b64url(enc.encode(JSON.stringify(payload)));
 const key=await signingKey(secret),sig=await crypto.subtle.sign('HMAC',key,enc.encode('angel-v35-admin-session.'+body));
 return {token:'s35.'+body+'.'+b64url(new Uint8Array(sig)),expiresAt:new Date(payload.exp*1000).toISOString(),ttlSeconds:TTL_SECONDS};
}
export async function verifyAdminSession(request,env,now=Math.floor(Date.now()/1000)){
 try{
  const bearer=headerValue(request.headers.get('Authorization'));
  if(!bearer.startsWith('Bearer s35.')||bearer.length>620)return false;
  const parts=bearer.slice(7).split('.');
  if(parts.length!==3||parts[0]!=='s35')return false;
  const payload=JSON.parse(new TextDecoder().decode(fromB64(parts[1])));
  if(!payload||payload.v!==1||payload.role!=='owner'||!Number.isInteger(payload.iat)||!Number.isInteger(payload.exp)||
     payload.iat>now+60||payload.exp<=now||payload.exp-payload.iat>TTL_SECONDS||!/^[\w-]{16,32}$/.test(payload.jti))return false;
  const key=await signingKey(env.LINK_ADMIN_KEY);
  return await crypto.subtle.verify('HMAC',key,fromB64(parts[2]),enc.encode('angel-v35-admin-session.'+parts[1]));
 }catch(_e){return false}
}
export async function handleAdminSession(request,env){
 const url=new URL(request.url),origin=headerValue(request.headers.get('Origin'));
 if(url.pathname!=='/admin/session')return null;
 if(!ORIGINS.has(origin))return response({ok:false,error:'origin_denied'},403,origin);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors(origin),
  'Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization',
  'Access-Control-Max-Age':'900'}});
 if(request.method!=='POST')return response({ok:false,error:'method'},405,origin);
 if(typeof env.LINK_ADMIN_KEY!=='string'||env.LINK_ADMIN_KEY.length<32)
  return response({ok:false,error:'login_unavailable'},503,origin);
 if(Number(request.headers.get('Content-Length')||0)>1200)return response({ok:false,error:'invalid_credentials'},401,origin);
 let credentials;
 try{const raw=await request.text();if(raw.length>1200)throw Error('large');credentials=JSON.parse(raw)}catch(_e){}
 if(!credentials||!await constantMatch(credentials.key,env.LINK_ADMIN_KEY)){
   return response({ok:false,error:'invalid_credentials'},401,origin);
 }
 const session=await issue(env.LINK_ADMIN_KEY);
 return response({ok:true,...session,role:'owner'},200,origin);
}
