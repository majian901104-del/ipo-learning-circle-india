import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/index.mjs';
import {dynamicPrimaryUrl} from '../src/link-management.mjs';
const MAIN_A='https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv';
const MAIN_B='https://chat.whatsapp.com/ZyXwVuTsRqPoNmLkJiHgFe';
const FALLBACK='https://cc.stockscode.click';
const ADMIN='only-for-tests-not-a-real-admin-secret-V36-4f5728a';
function setup(primary=MAIN_A,standby=null){
 const events=[];
 const state={active_url:primary,standby_url:standby,version:1,changed_at:'2026-10-15T01:00:00.000Z'};
 const audits=[];
 const db={
  prepare(sql){
   let args=[];
   return {
    bind(...input){args=input;return this},
    async first(){
     if(sql.includes('SELECT active_url'))return {...state};
     if(sql.includes('SELECT old_url FROM'))return null;
     return null
    },
    async all(){if(sql.includes('link_audit'))return {results:[...audits]};return {results:[]}},
    async run(){
     if(sql.includes('UPDATE link_state SET active_url=?')){
      const [value,time,version]=args;
      if(state.version!==version)return {meta:{changes:0}};
      Object.assign(state,{active_url:value,version:state.version+1,changed_at:time});
      return {meta:{changes:1}};
     }
     if(sql.includes('INSERT INTO link_audit')){
      const [action,old_url,new_url,at]=args;
      audits.push({id:audits.length+1,action,old_url,new_url,at});
      return {meta:{changes:1}};
     }
     throw Error('unexpected SQL '+sql);
    }
   };
  }
 };
 const env={LINK_DB:db,LINK_MODE_ENABLED:'false',LINK_DYNAMIC_TARGET_ENABLED:'true',
 COMMUNITY_DESTINATION:FALLBACK,LINK_ADMIN_KEY:ADMIN,ANALYTICS:{writeDataPoint(v){events.push(v)}}};
 return {state,audits,db,events,env}
}
const join=async(e,query='?c=x_campaign&s=x')=>worker.fetch(new Request('https://worker.example/join'+query,{headers:{'Sec-Fetch-Mode':'navigate'}}),e);
test('V3.6 only primary configured: /join redirects to D1 primary A',async()=>{
 const {env,events}=setup(MAIN_A,null);
 const r=await join(env);
 assert.equal(r.status,302);
 assert.equal(r.headers.get('Location'),MAIN_A);
 assert.equal(r.headers.get('Cache-Control'),'no-store');
 assert.equal(r.headers.get('Referrer-Policy'),'no-referrer');
 assert.equal(events.length,1);
});
test('visitors are not denied because spare group is missing, regardless of source/IP',async()=>{
 const {env}=setup();
 const r=await worker.fetch(new Request('https://worker.example/join?destination=https://evil.example',{headers:{
  'CF-Connecting-IP':'203.0.113.14','Sec-Fetch-Mode':'navigate','Referer':'https://random.example/post'
 }}),env);
 assert.equal(r.status,302);
 assert.equal(r.headers.get('Location'),MAIN_A);
});
test('change current primary directly without standby; next request gets updated B',async()=>{
 const {env,state,audits}=setup(MAIN_A,null);
 const response=await worker.fetch(new Request('https://worker.example/admin/links/primary',{
  method:'PUT',headers:{Origin:'https://angelresearchindia.com',Authorization:'Bearer '+ADMIN,'Content-Type':'application/json'},
  body:JSON.stringify({url:MAIN_B,version:state.version})
 }),env);
 assert.equal(response.status,200,await response.clone().text());
 assert.equal(state.active_url,MAIN_B);
 assert.equal(state.standby_url,null);
 assert.equal(audits.length,1);
 assert.equal(audits[0].action,'replace_primary');
 assert.equal(audits[0].old_url,MAIN_A);
 assert.equal(audits[0].new_url,MAIN_B);
 assert.equal((await join(env)).headers.get('Location'),MAIN_B);
});
test('optimistic concurrency blocks stale updates and leaves existing primary unchanged',async()=>{
 const {env,state}=setup(MAIN_A,null);
 const r=await worker.fetch(new Request('https://worker.example/admin/links/primary',{
  method:'PUT',headers:{Origin:'https://angelresearchindia.com',Authorization:'Bearer '+ADMIN},
  body:JSON.stringify({url:MAIN_B,version:0})
 }),env);
 assert.equal(r.status,409);
 assert.equal(state.active_url,MAIN_A);
});
test('no configured primary or failed D1 read never redirect to old cc.stockscode.click',async()=>{
 const blank=setup(null,null);
 const missing=await join(blank.env);
 assert.equal(missing.status,503);
 assert.equal(missing.headers.get('Location'),null);
 const broken=setup();
 broken.env.LINK_DB={prepare(){throw Error('db_offline')}};
 const res=await join(broken.env);
 assert.equal(res.status,503);
 assert.equal(res.headers.get('Location'),null);
});
test('invalid or non-WhatsApp primary stored in DB cannot redirect unsuspecting visitor',async()=>{
 const {env}=setup('https://evil.example/phishing');
 assert.equal((await join(env)).status,503);
 assert.equal(await dynamicPrimaryUrl(env),null);
});
test('unrelated query params cannot override the configured main target',async()=>{
 const {env}=setup();
 const r=await join(env,'?destination=https%3A%2F%2Fevil.example%2F&url=https%3A%2F%2Fevil.example%2F');
 assert.equal(r.headers.get('Location'),MAIN_A);
});
test('flag off retains old legacy destination for rollback',async()=>{
 const {env}=setup();
 env.LINK_DYNAMIC_TARGET_ENABLED='false';
 const r=await join(env);
 assert.equal(r.status,302);
 assert.equal(r.headers.get('Location'),FALLBACK);
});
test('health and admin report dynamic_primary, not social/India protected mode',async()=>{
 const {env}=setup();
 const h=await worker.fetch(new Request('https://worker.example/health'),env);
 const o=await h.json();
 assert.equal(o.routeMode,'dynamic_primary');
 const a=await worker.fetch(new Request('https://worker.example/admin/links',{
  headers:{Origin:'https://angelresearchindia.com',Authorization:'Bearer '+ADMIN}
 }),env);
 assert.equal(a.status,200);
 const j=await a.json();
 assert.equal(j.runtime.dynamicPrimaryEnabled,true);
 assert.equal(j.runtime.protectedMode,false);
 assert.equal(j.state.standby_url,null);
});
