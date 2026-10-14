/* IP replay guard for user-requested duplicate suppression.
 * Server-only; never store or record a plaintext IP address.
 * Cloudflare request headers are the only trusted network context.
 * A shared CGNAT or Wi-Fi address can cover many unrelated people; time bound it.
 */
const WINDOW_DEFAULT=24;
export function dedupHours(env){
 const n=Number(env.LINK_IP_DEDUP_HOURS||WINDOW_DEFAULT);
 return Number.isInteger(n)&&n>=1&&n<=168?n:WINDOW_DEFAULT;
}
export function dedupEnabled(env){return env.LINK_IP_DEDUP_ENABLED==='true'}
async function ipDigest(ip,secret){
 const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sig=await crypto.subtle.sign('HMAC',k,new TextEncoder().encode('angel-v341:public-ip:'+ip));
 return Array.from(new Uint8Array(sig),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function reserveUniqueIp(request,env,now=Math.floor(Date.now()/1000)){
 if(!dedupEnabled(env))return {allowed:true,disabled:true};
 if(!env.LINK_DB||typeof env.LINK_IP_HASH_KEY!=='string'||env.LINK_IP_HASH_KEY.length<32)
   return {allowed:false,unavailable:true};
 const ip=request.headers.get('CF-Connecting-IP')||'';
 // CF-Connecting-IP is set by Cloudflare at the Worker edge.
 // Ignore X-Forwarded-For, cookies, UTM fields and any browser-provided IP.
 if(ip.length<3||ip.length>48||!(/^[0-9a-fA-F:.]+$/.test(ip)))
   return {allowed:false,unavailable:true};
 const hash=await ipDigest(ip,env.LINK_IP_HASH_KEY),ttl=dedupHours(env)*3600;
 const result=await env.LINK_DB.prepare(
  'INSERT INTO link_ip_limits(ip_hash,expires_at,created_at,blocked_count) VALUES(?1,?2,?3,0) '+
  'ON CONFLICT(ip_hash) DO UPDATE SET '+
  'blocked_count=CASE WHEN link_ip_limits.expires_at>?3 THEN link_ip_limits.blocked_count+1 ELSE 0 END,'+
  'created_at=CASE WHEN link_ip_limits.expires_at>?3 THEN link_ip_limits.created_at ELSE excluded.created_at END,'+
  'expires_at=CASE WHEN link_ip_limits.expires_at>?3 THEN link_ip_limits.expires_at ELSE excluded.expires_at END '+
  'RETURNING blocked_count'
 ).bind(hash,now+ttl,now).first();
 if(!result||!Number.isInteger(result.blocked_count))return {allowed:false,unavailable:true};
 return {allowed:result.blocked_count===0,windowHours:dedupHours(env)};
}
export function duplicateIpPage(hours=24){
 const h=Number.isInteger(hours)&&hours>=1&&hours<=168?hours:WINDOW_DEFAULT;
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow"><title>Invitation limit</title>'+
  '<style>body{background:#eef3f6;color:#173b51;font:16px/1.6 system-ui,sans-serif;'+
  'margin:0;display:grid;min-height:100vh;place-items:center;padding:20px}main{max-width:540px;'+
  'background:white;border:1px solid #d4e2e8;border-radius:12px;padding:32px;'+
  'box-shadow:0 16px 45px #12344415}h1{font-size:25px;margin:0 0 8px}</style></head><body>'+
  '<main><h1>Invitation already requested</h1>'+
  '<p>Only one WhatsApp invitation may be opened from the same network within '+
  h+' hours.</p><p>If you share a mobile network or public Wi-Fi with others, '+
  'please contact the group administrator.</p></main></body></html>';
 return new Response(html,{status:429,headers:{'Content-Type':'text/html; charset=utf-8',
  'Cache-Control':'no-store,private','X-Robots-Tag':'noindex,nofollow',
  'Referrer-Policy':'no-referrer'}});
}
