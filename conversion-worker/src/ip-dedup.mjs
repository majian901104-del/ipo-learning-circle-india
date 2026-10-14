/* V3.4.2: statistical IP dedup only. Never block /join access on repeat IP.
 * Track first page_view & first join_click independently in a rolling 24-hour
 * period per public IP. Store a keyed HMAC hash, not a raw address.
 */
const DEFAULT_HOURS=24;
export const dedupHours=env=>{
 const n=Number(env.ANALYTICS_IP_DEDUP_HOURS||DEFAULT_HOURS);
 return Number.isInteger(n)&&n>=1&&n<=168?n:DEFAULT_HOURS;
};
export const dedupEnabled=env=>env.ANALYTICS_IP_DEDUP_ENABLED==='true';
export const dedupReady=env=>!!(env.LINK_DB&&typeof env.ANALYTICS_IP_HASH_KEY==='string'&&env.ANALYTICS_IP_HASH_KEY.length>=32);
async function hashNetwork(value,secret){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value));
 return Array.from(new Uint8Array(signature),x=>x.toString(16).padStart(2,'0')).join('');
}
export async function shouldCountIp(request,env,metric,now=Math.floor(Date.now()/1000)){
 if(!dedupEnabled(env))return true;
 if(!['page_view','join_click'].includes(metric))return true;
 if(!dedupReady(env))return false; // suppress analytics, never fail redirect
 const ip=request.headers.get('CF-Connecting-IP')||'';
 if(ip.length<3||ip.length>48||!/^[0-9a-fA-F:.]+$/.test(ip))return false;
 try{
  const hash=await hashNetwork('stat-v342:'+metric+':'+ip,env.ANALYTICS_IP_HASH_KEY);
  const result=await env.LINK_DB.prepare(
   'INSERT INTO analytics_ip_dedup(metric,ip_hash,expires_at,first_seen_at,seen_count) VALUES(?,?,?,?,1) '+
   'ON CONFLICT(metric,ip_hash) DO UPDATE SET '+
   'seen_count=CASE WHEN analytics_ip_dedup.expires_at>?4 THEN analytics_ip_dedup.seen_count+1 ELSE 1 END,'+
   'expires_at=CASE WHEN analytics_ip_dedup.expires_at>?4 THEN analytics_ip_dedup.expires_at ELSE excluded.expires_at END,'+
   'first_seen_at=CASE WHEN analytics_ip_dedup.expires_at>?4 THEN analytics_ip_dedup.first_seen_at ELSE excluded.first_seen_at END '+
   'RETURNING seen_count'
  ).bind(metric,hash,now+dedupHours(env)*3600,now).first();
  return result?.seen_count===1;
 }catch(_e){return false}
}
