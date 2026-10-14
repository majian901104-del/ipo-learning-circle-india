import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.mjs';
import {verifyAdminSession} from '../src/admin-session.mjs';
const ROOT='https://test-worker.invalid';
const ORIGIN='https://angelresearchindia.com';
const ADMIN='dummy-high-entropy-admin-key-for-CI-only-1fa3216570d6c45cc';
const REPORT='dummy-report-key-used-only-in-github-tests-f39c20871902';
const env=()=>({
 LINK_ADMIN_KEY:ADMIN,REPORT_ACCESS_KEY:REPORT,
 ANALYTICS_SQL:{async query(){return {data:[]}}},
 LINK_DB:{prepare(sql){
   if(sql.includes('link_audit'))return {all:async()=>({results:[]})};
   if(sql.includes('link_state'))return {first:async()=>({active_url:null,standby_url:null,version:0,changed_at:null})};
   throw Error('unanticipated sql '+sql);
 }}
});
async function login(secret=ADMIN,e=env(),origin=ORIGIN){
 return worker.fetch(new Request(ROOT+'/admin/session',{
   method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
   body:JSON.stringify({key:secret})
 }),e);
}
test('one existing LINK_ADMIN_KEY issues an expiring owner session, not a stored credential',async()=>{
 const e=env(),response=await login(ADMIN,e);
 assert.equal(response.status,200);
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),ORIGIN);
 assert.equal(response.headers.get('Set-Cookie'),null);
 assert.match(response.headers.get('Cache-Control'),/no-store/);
 const data=await response.json();
 assert.equal(data.ok,true);
 assert.equal(data.role,'owner');
 assert.equal(data.ttlSeconds,14400);
 assert.match(data.token,/^s35\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
 assert.equal(JSON.stringify(data).includes(ADMIN),false);
 const now=Math.floor(Date.now()/1000);
 const request=new Request(ROOT+'/report',{headers:{Origin:ORIGIN,Authorization:'Bearer '+data.token}});
 assert.equal(await verifyAdminSession(request,e,now),true);
 assert.equal(await verifyAdminSession(request,e,now+14401),false);
});
test('single session authorizes both report and D1 link management',async()=>{
 const e=env(),data=await(await login(ADMIN,e)).json();
 for(const pathname of ['/report?days=7','/admin/links']){
  const res=await worker.fetch(new Request(ROOT+pathname,{headers:{Origin:ORIGIN,Authorization:'Bearer '+data.token}}),e);
  assert.equal(res.status,200,pathname+' '+await res.text().catch(()=>'')); 
 }
});
test('bad login, invalid origin and invalid token are rejected',async()=>{
 const e=env();
 assert.equal((await login('not-right-long-enough-key-1fa3216570d6',e)).status,401);
 assert.equal((await login(ADMIN,e,'https://evil.example')).status,403);
 const preflight=await worker.fetch(new Request(ROOT+'/admin/session',{
   method:'OPTIONS',headers:{Origin:ORIGIN,'Access-Control-Request-Method':'POST'}
 }),e);
 assert.equal(preflight.status,204);
 assert.match(preflight.headers.get('Access-Control-Allow-Headers'),/Content-Type/);
 const data=await(await login(ADMIN,e)).json();
 const tampered=data.token.slice(0,-2)+'XX';
 assert.equal(await verifyAdminSession(new Request(ROOT+'/admin/links',{
   headers:{Origin:ORIGIN,Authorization:'Bearer '+tampered}
 }),e),false);
 assert.equal((await worker.fetch(new Request(ROOT+'/report',{headers:{Origin:ORIGIN,Authorization:'Bearer '+tampered}}),e)).status,401);
 assert.equal((await worker.fetch(new Request(ROOT+'/admin/links',{headers:{Origin:ORIGIN,Authorization:'Bearer '+tampered}}),e)).status,401);
});
test('admin key rotation revokes all outstanding sessions and legacy report credentials still work',async()=>{
 const e=env(),data=await(await login(ADMIN,e)).json();
 e.LINK_ADMIN_KEY='rotated-credential-very-long-value-for-tests-1f66a974c4';
 assert.equal(await verifyAdminSession(new Request(ROOT+'/report',{headers:{Authorization:'Bearer '+data.token}}),e),false);
 const oldReport=await worker.fetch(new Request(ROOT+'/report',{headers:{Origin:ORIGIN,Authorization:'Bearer '+REPORT}}),e);
 assert.equal(oldReport.status,200);
});
test('no new secret, database migration or cookie is required for unified login',async()=>{
 const e=env();delete e.REPORT_ACCESS_KEY;
 const res=await login(ADMIN,e);
 assert.equal(res.status,200);
 const json=await res.json();assert.ok(json.token);
});
test('prohibit submitting login credentials in URL query parameters',async()=>{
 const e=env();
 const response=await worker.fetch(new Request(ROOT+'/admin/session?key='+encodeURIComponent(ADMIN),{
  method:'GET',headers:{Origin:ORIGIN}
 }),e);
 assert.equal(response.status,405);
});
