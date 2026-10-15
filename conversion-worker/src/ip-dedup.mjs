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
// Existing LINK_ADMIN_KEY may be used as a server-only HMAC key when a
// dedicated statistics key is absent. Input is purpose-separated; changing the
// admin key resets the rolling 24-hour count, but creates no new login password.
const secret=env=>(typeof env.ANALYTICS_IP_HASH_KEY==='string'&&env.ANALYTICS_IP_HASH_KEY.length>=32?
 env.ANALYTICS_IP_HASH_KEY:typeof env.LINK_ADMIN_KEY==='string'&&env.LINK_ADMIN_KEY.length>=32?
 env.LINK_ADMIN_KEY:null);
export const dedupReady=env=>!!(env.LINK_DB&&secret(env));
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
  const hash=await hashNetwork('angel-stat-ip-v38:'+metric+':'+ip,secret(env));
  const execute=()=>env.LINK_DB.prepare(
   'INSERT INTO analytics_ip_dedup(metric,ip_hash,expires_at,first_seen_at,seen_count) VALUES(?,?,?,?,1) '+
   'ON CONFLICT(metric,ip_hash) DO UPDATE SET '+
   'seen_count=CASE WHEN analytics_ip_dedup.expires_at>?4 THEN analytics_ip_dedup.seen_count+1 ELSE 1 END,'+
   'expires_at=CASE WHEN analytics_ip_dedup.expires_at>?4 THEN analytics_ip_dedup.expires_at ELSE excluded.expires_at END,'+
   'first_seen_at=CASE WHEN analytics_ip_dedup.expires_at>?4 THEN analytics_ip_dedup.first_seen_at ELSE excluded.first_seen_at END '+
   'RETURNING seen_count'
  ).bind(metric,hash,now+dedupHours(env)*3600,now).first();
  let result;
  try{result=await execute()}
  catch(error){
   // One-time lazy idempotent D1 schema bootstrap. Never modify personal leads.
   if(!/no such table|analytics_ip_dedup|SQLITE_ERROR/i.test(String(error)))throw error;
   await env.LINK_DB.prepare(
    "CREATE TABLE IF NOT EXISTS analytics_ip_dedup ("+
    "metric TEXT NOT NULL CHECK(metric IN ('page_view','join_click')),"+
    "ip_hash TEXT NOT NULL,expires_at INTEGER NOT NULL,"+
    "first_seen_at INTEGER NOT NULL,seen_count INTEGER NOT NULL DEFAULT 1,"+
    "PRIMARY KEY(metric,ip_hash))"
   ).run();
   await env.LINK_DB.prepare('CREATE INDEX IF NOT EXISTS analytics_ip_dedup_expiry ON analytics_ip_dedup(expires_at)').run();
   result=await execute();
  }
  return result?.seen_count===1;
 }catch(_e){return false}
}
