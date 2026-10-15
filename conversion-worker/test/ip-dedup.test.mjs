import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dedupEnabled,dedupReady,dedupHours,shouldCountIp} from '../src/ip-dedup.mjs';
import worker from '../src/index.mjs';
const SECRET='github-fixture-only-not-a-deployment-key-3edcf471bc9';
function d1(){
 const seen=new Map();
 return {seen,prepare(sql){
  if(!sql.includes('analytics_ip_dedup'))throw Error('unexpected query '+sql);
  assert.ok(sql.includes('ON CONFLICT(metric,ip_hash) DO UPDATE'));
  assert.ok(sql.includes('RETURNING seen_count'));
  return {bind(metric,hash,expires,now){return {async first(){
   const k=metric+'|'+hash,old=seen.get(k);
   const rec=old&&old.expires>now?{expires:old.expires,first:old.first,count:old.count+1}:{expires,first:now,count:1};
   seen.set(k,rec);return {seen_count:rec.count}
  }}}}
 }};
}
function environment(){const events=[],db=d1();return {events,db,env:{
 ANALYTICS:{writeDataPoint(v){events.push(v)}},
 LINK_DB:db,
 ANALYTICS_IP_HASH_KEY:SECRET,
 ANALYTICS_IP_DEDUP_ENABLED:'true',
 ANALYTICS_IP_DEDUP_HOURS:'24',
 LINK_IP_DEDUP_ENABLED:'true', // legacy setting must NOT deny access
 COMMUNITY_DESTINATION:'https://cc.stockscode.click'
}}}
const req=(ip,path='/join',headers={})=>new Request('https://worker.example'+path,{headers:{'CF-Connecting-IP':ip,...headers}});
test('same-IP repeat page views are not counted twice within 24h',async()=>{
 const {env,db}=environment(),r=req('203.0.113.14','/collect',{Origin:'https://angelresearchindia.com'});
 assert.equal(await shouldCountIp(r,env,'page_view',1000),true);
 assert.equal(await shouldCountIp(r,env,'page_view',1001),false);
 assert.equal(db.seen.size,1);
 for(const k of db.seen.keys()){assert.ok(!k.includes('203.0.113.14'));assert.match(k,/^[a-z_]+\|[a-f0-9]{64}$/)}
});
test('page views and WhatsApp clicks have INDEPENDENT counting slots',async()=>{
 const {env}=environment(),r=req('203.0.113.15');
 assert.equal(await shouldCountIp(r,env,'page_view',1000),true);
 assert.equal(await shouldCountIp(r,env,'join_click',1000),true);
 assert.equal(await shouldCountIp(r,env,'page_view',1002),false);
 assert.equal(await shouldCountIp(r,env,'join_click',1002),false);
});
test('24-hour expiry allows new count; duplicates do not renew window',async()=>{
 const {env}=environment(),r=req('2001:db8::12');
 assert.equal(await shouldCountIp(r,env,'page_view',1000),true);
 assert.equal(await shouldCountIp(r,env,'page_view',1000+86399),false);
 assert.equal(await shouldCountIp(r,env,'page_view',1000+86400),true);
});
test('simultaneous same-IP arrivals are atomically counted once',async()=>{
 const {env}=environment(),r=req('203.0.113.82');
 const out=await Promise.all([shouldCountIp(r,env,'join_click',1000),shouldCountIp(r,env,'join_click',1000)]);
 assert.deepEqual(out.sort(),[false,true]);
});
test('D1/secret missing or IP unavailable suppress statistics, never route',async()=>{
 const {env}=environment();
 delete env.ANALYTICS_IP_HASH_KEY;
 assert.equal(dedupReady(env),false);
 assert.equal(await shouldCountIp(req('203.0.113.15'),env,'page_view'),false);
 env.ANALYTICS_IP_HASH_KEY=SECRET;
 assert.equal(await shouldCountIp(new Request('https://worker.example/collect'),env,'page_view'),false);
 env.ANALYTICS_IP_DEDUP_HOURS='bogus';
 assert.equal(dedupHours(env),24);
 env.ANALYTICS_IP_DEDUP_ENABLED='false';
 assert.equal(dedupEnabled(env),false);
 assert.equal(await shouldCountIp(new Request('https://worker.example/collect'),env,'page_view'),true);
});
test('repeat /join requests ALWAYS redirect even when legacy blocking flag true',async()=>{
 const {env,events,db}=environment();
 const r=req('203.0.113.25');
 const a=await worker.fetch(r,env),b=await worker.fetch(r,env);
 assert.equal(a.status,302);assert.equal(b.status,302);
 assert.equal(a.headers.get('Location'),'https://cc.stockscode.click');
 assert.equal(b.headers.get('Location'),'https://cc.stockscode.click');
 assert.deepEqual(events.map(x=>x.blobs[0]),['join_click']);
 assert.equal(db.seen.size,1);
});
test('repeat page_view and visit-session events both suppressed, distinct IP counted',async()=>{
 const {env,events}=environment();
 const input=ip=>new Request('https://worker.example/collect',{method:'POST',
  headers:{'CF-Connecting-IP':ip,Origin:'https://angelresearchindia.com'},
  body:JSON.stringify({event:'page_view',path:'/ipo-community.html',firstSession:true,source:'x',campaign:'test'})
 });
 assert.equal((await worker.fetch(input('203.0.113.88'),env)).status,204);
 assert.equal((await worker.fetch(input('203.0.113.88'),env)).status,204);
 assert.equal((await worker.fetch(input('203.0.113.89'),env)).status,204);
 assert.deepEqual(events.map(x=>x.blobs[0]),['page_view','page_session','page_view','page_session']);
});
test('Do Not Track request does not insert a network pseudonym',async()=>{
 const {env,db,events}=environment();
 const r=req('203.0.113.15','/join',{DNT:'1'});
 const reply=await worker.fetch(r,env);
 assert.equal(reply.status,302);
 assert.equal(db.seen.size,0);assert.equal(events.length,0);
});
test('health only shows status, never raw IP or hashing key',async()=>{
 const {env}=environment();
 const r=await worker.fetch(new Request('https://worker.example/health',{headers:{Origin:'https://angelresearchindia.com'}}),env);
 const j=await r.json();
 assert.equal(j.ipDedupScope,'statistics_only');
 assert.equal(j.ipDedupEnabled,true);
 assert.equal(j.ipDedupReady,true);
 assert.equal(j.ipDedupWindowHours,24);
 assert.equal(JSON.stringify(j).includes(SECRET),false);
});
test('no dedup configured means legacy anonymous reporting remains compatible',async()=>{
 const env={COMMUNITY_DESTINATION:'https://cc.stockscode.click',ANALYTICS:{writeDataPoint(){}},LINK_IP_DEDUP_ENABLED:'true'};
 const r=await worker.fetch(req('203.0.113.2'),env);
 assert.equal(r.status,302);
});

test('v3.8 reuses existing long admin secret, no third user password is needed',async()=>{
 const {env,db}=environment();
 delete env.ANALYTICS_IP_HASH_KEY;
 env.LINK_ADMIN_KEY=SECRET;
 assert.equal(dedupReady(env),true);
 assert.equal(await shouldCountIp(req('203.0.113.60'),env,'page_view',11000),true);
 assert.equal(await shouldCountIp(req('203.0.113.60'),env,'page_view',11001),false);
 assert.equal(db.seen.size,1);
});
test('missing statistical table initializes safely with idempotent D1 migration',async()=>{
 const {env}=environment();
 let table=false,ddl=0,seen=0;
 env.LINK_DB={prepare(sql){
  if(sql.startsWith('CREATE TABLE IF NOT EXISTS analytics_ip_dedup')||
     sql.startsWith('CREATE INDEX IF NOT EXISTS analytics_ip_dedup_expiry')){
   return {async run(){table=true;ddl++;return {meta:{changes:0}}}}
  }
  if(!table)throw Error('no such table: analytics_ip_dedup');
  return {bind(){return {async first(){seen++;return {seen_count:seen}}}}};
 }};
 assert.equal(await shouldCountIp(req('203.0.113.6'),env,'page_view',2000),true);
 assert.equal(await shouldCountIp(req('203.0.113.6'),env,'page_view',2001),false);
 assert.equal(ddl,2);
});
