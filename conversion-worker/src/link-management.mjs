/* V3.3 Cloudflare protected group routing. Requires D1 LINK_DB, LINK_ADMIN_KEY,
   and LINK_MODE_ENABLED=true. Referral headers are signals, not identity proof. */
import {dedupEnabled,dedupHours,dedupReady} from './ip-dedup.mjs';
import {verifyAdminSession} from './admin-session.mjs';
const HOME='https://angelresearchindia.com';
const ORIGINS=new Set([HOME,'https://www.angelresearchindia.com','https://majian901104-del.github.io']);
const PLATFORMS={x:['x.com','twitter.com','t.co'],facebook:['facebook.com','fb.com','fb.me'],
instagram:['instagram.com'],youtube:['youtube.com','youtu.be']};
const clean=(v,n=45)=>String(v||'').toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,n)||'direct';
function platformFromReferer(text){
 try{
  const u=new URL(text);if(u.protocol!=='https:')return null;
  const h=u.hostname.toLowerCase().replace(/^www\./,'');
  for(const [p,hosts] of Object.entries(PLATFORMS)){
   if(hosts.some(x=>h===x||h.endsWith('.'+x)))return p;
  }
 }catch(_e){}return null;
}
const json=(data,status=200,origin='')=>new Response(JSON.stringify(data),{status,headers:{
 'Content-Type':'application/json','Cache-Control':'no-store,private',
 ...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});
const fail=(error,status,origin='')=>json({ok:false,error},status,origin);
async function digest(value){
 const a=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
 return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');
}
async function authorized(req,env){
 if(await verifyAdminSession(req,env))return true;
 const expected=env.LINK_ADMIN_KEY;
 if(typeof expected!=='string'||expected.length<32)return false;
 const h=req.headers.get('Authorization')||'';
 if(!h.startsWith('Bearer ')||h.length<39)return false;
 const a=await digest(h.slice(7)),b=await digest(expected);
 let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}
function official(value){return /^https:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9]{15,45}\/?$/.test(value)}
async function allowedDestination(value,env){
 if(typeof value!=='string'||value.length>1024)return false;
 let u;try{u=new URL(value)}catch(_e){return false}
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)return false;
 if(official(u.href))return true;
 const allow=String(env.SHORTLINK_ALLOWLIST||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!allow.includes(u.hostname.toLowerCase()))return false;
 for(let i=0;i<5;i++){
  if(official(u.href))return true;
  if(!allow.includes(u.hostname.toLowerCase()))return false;
  let response;
  try{response=await fetch(u.href,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(4500)})}catch(_e){return false}
  if(![301,302,303,307,308].includes(response.status))return false;
  try{u=new URL(response.headers.get('Location'),u.href)}catch(_e){return false}
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)return false;
 }
 return official(u.href);
}
async function current(env){return env.LINK_DB.prepare('SELECT active_url,standby_url,version,changed_at FROM link_state WHERE id=1').first()}
export async function dynamicPrimaryUrl(env){
 if(!env.LINK_DB)throw Error('database_missing');
 const state=await current(env);
 const value=state?.active_url||'';
 if(!value)return null;
 // Database entries were checked at save time. Never trust a query-string
 // destination and never fall back to the old hard-coded target.
 if(official(value))return value;
 let u;try{u=new URL(value)}catch(_e){return null}
 const allow=String(env.SHORTLINK_ALLOWLIST||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||!allow.includes(u.hostname.toLowerCase()))return null;
 return u.href;
}
async function smallBody(req){
 const s=await req.text();if(s.length>2048)throw Error('large');
 const b=JSON.parse(s);if(!b||Array.isArray(b)||typeof b!=='object')throw Error('object');
 return b;
}
function redirect(url,status=302){
 return new Response(null,{status,headers:{Location:url,'Cache-Control':'no-store,no-cache,max-age=0',
 'Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex,nofollow'}});
}
async function protectedEntry(req,env){
 if(req.method!=='GET')return fail('method',405);
 if(req.cf?.country!=='IN')return fail('access_denied',404);
 const platform=platformFromReferer(req.headers.get('Referer'));
 if(!platform)return fail('source_not_verified',404);
 const q=new URL(req.url).searchParams;
 if(q.has('s')&&q.get('s')!==platform)return fail('source_mismatch',404);
 const token=Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join('');
 const campaign=clean(q.get('c'));
 await env.LINK_DB.prepare('INSERT INTO link_grants(token_hash,source,campaign,expires_at) VALUES(?,?,?,?)')
 .bind(await digest(token),platform,campaign,Math.floor(Date.now()/1000)+900).run();
 const landing=q.get('landing')||'ipo-community.html';
 if(!['ipo-community.html','ipo-current.html','index.html'].includes(landing))return fail('invalid_landing',404);
 const go=new URL(HOME+'/'+landing);
 go.searchParams.set('admission',token);
 go.searchParams.set('utm_source',platform);
 go.searchParams.set('utm_campaign',campaign);
 return redirect(go.href,303);
}
async function protectedJoin(req,env,record){
 if(req.method!=='GET')return fail('method',405);
 if(req.cf?.country!=='IN')return fail('access_denied',404);
 const token=new URL(req.url).searchParams.get('admission')||'';
 if(!/^[a-f0-9]{48}$/.test(token))return fail('invalid_admission',404);
 const state=await current(env);if(!state?.active_url)return fail('group_unavailable',503);
 const now=Math.floor(Date.now()/1000);
 const grant=await env.LINK_DB.prepare('UPDATE link_grants SET used_at=? WHERE token_hash=? AND used_at IS NULL AND expires_at>? RETURNING source,campaign')
 .bind(now,await digest(token),now).first();
 if(!grant)return fail('expired_or_used',404);
 if(req.headers.get('DNT')!=='1'&&req.headers.get('Sec-GPC')!=='1'&&record)
  await record(env,req,'join_click',{path:'/join',source:grant.source,campaign:grant.campaign,medium:'social'});
 return redirect(state.active_url);
}
async function protectedAdmin(req,env){
 const origin=req.headers.get('Origin')||'';
 if(!ORIGINS.has(origin))return fail('origin_denied',403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{
 'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization,Content-Type',
 'Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS','Cache-Control':'no-store','Vary':'Origin'}});
 if(!env.LINK_ADMIN_KEY||env.LINK_ADMIN_KEY.length<32)return fail('admin_not_configured',503,origin);
 if(!await authorized(req,env))return fail('unauthorized',401,origin);
 const path=new URL(req.url).pathname;
 if(path==='/admin/links'&&req.method==='GET'){
  const history=(await env.LINK_DB.prepare('SELECT id,action,old_url,new_url,at FROM link_audit ORDER BY id DESC LIMIT 20').all()).results||[];
  return json({ok:true,state:await current(env),history,runtime:{protectedMode:env.LINK_MODE_ENABLED==='true',dynamicPrimaryEnabled:env.LINK_MODE_ENABLED!=='true'&&env.LINK_DYNAMIC_TARGET_ENABLED==='true',ipDedupEnabled:dedupEnabled(env),ipDedupWindowHours:dedupHours(env),ipDedupReady:dedupReady(env),ipDedupScope:'statistics_only'}},200,origin);
 }
 if(['/admin/links/primary','/admin/links/standby'].includes(path)&&req.method==='PUT'){
  let b;try{b=await smallBody(req)}catch(_e){return fail('bad_input',400,origin)}
  if(!await allowedDestination(b.url,env))return fail('unverified_destination',422,origin);
  const s=await current(env);
  if(!s)return fail('schema_missing',503,origin);
  if(!Number.isInteger(b.version)||s.version!==b.version)return fail('version_conflict',409,origin);
  const primary=path.endsWith('primary');
  if(primary&&s.active_url===b.url)return fail('primary_unchanged',409,origin);
  const sql=primary?
  'UPDATE link_state SET active_url=?,version=version+1,changed_at=? WHERE id=1 AND version=?':
  'UPDATE link_state SET standby_url=?,version=version+1,changed_at=? WHERE id=1 AND version=?';
  const at=new Date().toISOString();
  const updated=await env.LINK_DB.prepare(sql).bind(b.url,at,s.version).run();
  if(updated.meta?.changes!==1)return fail('version_conflict',409,origin);
  await env.LINK_DB.prepare('INSERT INTO link_audit(action,old_url,new_url,at) VALUES(?,?,?,?)')
   .bind(primary?(s.active_url?'replace_primary':'set_primary'):'set_standby',primary?s.active_url:s.standby_url,b.url,at).run();
  return json({ok:true,state:await current(env)},200,origin);
 }
 if(path==='/admin/links/restore'&&req.method==='POST'){
  let b;try{b=await smallBody(req)}catch(_e){return fail('bad_input',400,origin)}
  const s=await current(env);
  if(!s||b.version!==s.version)return fail('version_conflict',409,origin);
  if(!Number.isSafeInteger(b.auditId)||b.auditId<1)return fail('invalid_history_id',400,origin);
  const older=await env.LINK_DB.prepare('SELECT old_url FROM link_audit WHERE id=?').bind(b.auditId).first();
  if(!older?.old_url||!await allowedDestination(older.old_url,env))return fail('history_target_unavailable',422,origin);
  const at=new Date().toISOString();
  const result=await env.LINK_DB.prepare('UPDATE link_state SET standby_url=?,version=version+1,changed_at=? WHERE id=1 AND version=?')
   .bind(older.old_url,at,s.version).run();
  if(result.meta?.changes!==1)return fail('version_conflict',409,origin);
  await env.LINK_DB.prepare('INSERT INTO link_audit(action,old_url,new_url,at) VALUES(?,?,?,?)')
   .bind('restore_to_standby',s.standby_url,older.old_url,at).run();
  return json({ok:true,state:await current(env)},200,origin);
 }
 if(path==='/admin/links/switch'&&req.method==='POST'){
  let b;try{b=await smallBody(req)}catch(_e){return fail('bad_input',400,origin)}
  const s=await current(env);
  if(!s?.standby_url)return fail('standby_missing',409,origin);
  if(b.version!==s.version)return fail('version_conflict',409,origin);
  if(!await allowedDestination(s.standby_url,env))return fail('standby_invalid',422,origin);
  const at=new Date().toISOString();
  const results=await env.LINK_DB.batch([
   env.LINK_DB.prepare('UPDATE link_state SET active_url=standby_url,standby_url=NULL,version=version+1,changed_at=? WHERE id=1 AND version=? AND standby_url=?')
   .bind(at,s.version,s.standby_url),
   env.LINK_DB.prepare('INSERT OR IGNORE INTO link_audit(action,old_url,new_url,at,event_version) SELECT ?,?,?,?,? FROM link_state WHERE id=1 AND version=? AND active_url=?')
   .bind('switch',s.active_url,s.standby_url,at,s.version+1,s.version+1,s.standby_url)
  ]);
  if(results[0]?.meta?.changes!==1)return fail('version_conflict',409,origin);
  return json({ok:true,state:await current(env)},200,origin);
 }
 return fail('unsupported',405,origin);
}
export async function handleLinkRoute(request,env,record){
 const p=new URL(request.url).pathname;
 if(p.startsWith('/admin/links')){
  if(!env.LINK_DB)return fail('database_not_configured',503,request.headers.get('Origin')||'');
  try{return await protectedAdmin(request,env)}catch(_e){return fail('temporary_unavailable',503)}
 }
 if(p==='/entry'||(p==='/join'&&env.LINK_MODE_ENABLED==='true')){
  if(env.LINK_MODE_ENABLED!=='true'||!env.LINK_DB)return fail('protected_links_unavailable',503);
  try{return p==='/entry'?await protectedEntry(request,env):await protectedJoin(request,env,record)}
  catch(_e){return fail('temporary_unavailable',503)}
 }
 return null;
}
export {platformFromReferer,official,allowedDestination};
