import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dedupEnabled,dedupHours,reserveUniqueIp,duplicateIpPage} from '../src/ip-dedup.mjs';
import worker from '../src/index.mjs';
function mockDB(){
 const state=new Map();
 return {state,prepare(sql){
  assert.match(sql,/ON CONFLICT\(ip_hash\) DO UPDATE/);
  assert.match(sql,/RETURNING blocked_count/);
  return {bind(hash,expires,now){return {async first(){
   const old=state.get(hash);
   const current=old&&old.expires>now?{expires:old.expires,created:old.created,count:old.count+1}:{expires,created:now,count:0};
   state.set(hash,current);
   return {blocked_count:current.count};
  }}}};
 }};
}
const SECRET='just-for-github-unit-tests-never-use-as-live-key-6ca238fe';
const req=(ip,mode='navigate')=>new Request('https://worker.example/join?c=test&s=x',{
 headers:{'CF-Connecting-IP':ip,'Sec-Fetch-Mode':mode}
});
function env(db=mockDB()){return {LINK_DB:db,LINK_IP_HASH_KEY:SECRET,LINK_IP_DEDUP_ENABLED:'true',LINK_IP_DEDUP_HOURS:'24',
 COMMUNITY_DESTINATION:'https://cc.stockscode.click'};}
test('mode off is compatible, no D1 slot or secret required',async()=>{
 const e={LINK_IP_DEDUP_ENABLED:'false'};
 assert.equal(dedupEnabled(e),false);
 assert.deepEqual(await reserveUniqueIp(req('203.0.113.15'),e),{allowed:true,disabled:true});
 const response=await worker.fetch(req('203.0.113.15'),e);
 assert.equal(response.status,302);
});
test('first source IP passes, repeat IP blocked, second public IP passes',async()=>{
 const db=mockDB(),e=env(db);
 const a=await reserveUniqueIp(req('203.0.113.15'),e,100000);
 const b=await reserveUniqueIp(req('203.0.113.15'),e,100001);
 const c=await reserveUniqueIp(req('203.0.113.16'),e,100002);
 assert.equal(a.allowed,true);assert.equal(b.allowed,false);assert.equal(c.allowed,true);
 assert.equal(db.state.size,2);
 for(const hash of db.state.keys()){assert.match(hash,/^[a-f0-9]{64}$/);assert.ok(!hash.includes('203.0.113'))}
});
test('expiration resets after 24 hours, and rejected tries do not extend the window',async()=>{
 const db=mockDB(),e=env(db),ip=req('2001:db8::8');
 assert.equal((await reserveUniqueIp(ip,e,1000)).allowed,true);
 assert.equal((await reserveUniqueIp(ip,e,1001)).allowed,false);
 assert.equal((await reserveUniqueIp(ip,e,1000+24*3600-1)).allowed,false);
 assert.equal((await reserveUniqueIp(ip,e,1000+24*3600)).allowed,true);
 assert.equal([...db.state.values()][0].count,0);
});
test('concurrent requests from one IP cannot both claim the same slot',async()=>{
 const e=env();
 const outcomes=await Promise.all([reserveUniqueIp(req('203.0.113.77'),e,100),
  reserveUniqueIp(req('203.0.113.77'),e,100)]);
 assert.deepEqual(outcomes.map(x=>x.allowed).sort(),[false,true]);
});
test('missing secret, missing edge IP, invalid window fail safely',async()=>{
 const e=env();
 delete e.LINK_IP_HASH_KEY;
 assert.equal((await reserveUniqueIp(req('203.0.113.2'),e)).unavailable,true);
 e.LINK_IP_HASH_KEY=SECRET;
 assert.equal((await reserveUniqueIp(new Request('https://worker.example/join'),e)).unavailable,true);
 e.LINK_IP_DEDUP_HOURS='999999';
 assert.equal(dedupHours(e),24);
});
test('worker /join repeats return 429 HTML without location, preserving aggregate privacy',async()=>{
 const e=env();
 const first=await worker.fetch(req('203.0.113.91'),e);
 assert.equal(first.status,302);
 assert.equal(first.headers.get('Location'),'https://cc.stockscode.click');
 const second=await worker.fetch(req('203.0.113.91'),e);
 assert.equal(second.status,429);
 assert.equal(second.headers.get('Location'),null);
 const body=await second.text();
 assert.match(body,/within 24 hours/);
 assert.match(body,/share a mobile network/);
 assert.ok(!body.includes('203.0.113.91'));
 const third=await worker.fetch(req('203.0.113.92'),e);
 assert.equal(third.status,302);
 const resource=await worker.fetch(req('203.0.113.92','no-cors'),e);
 assert.equal(resource.status,403);
});
test('worker /health exposes mode only, not IP, secret or hashed identifiers',async()=>{
 const e=env();
 const response=await worker.fetch(new Request('https://worker.example/health',{
  headers:{Origin:'https://angelresearchindia.com'}}),e);
 const body=await response.json();
 assert.equal(body.ipDedupEnabled,true);
 assert.equal(body.ipDedupWindowHours,24);
 assert.equal(body.routeMode,'legacy');
 assert.equal(JSON.stringify(body).includes(SECRET),false);
 assert.equal(JSON.stringify(body).includes('203.0.113'),false);
});
test('duplicate block page has no redirect or invitation URL',async()=>{
 const r=duplicateIpPage();
 assert.equal(r.status,429);
 assert.equal(r.headers.get('X-Robots-Tag'),'noindex,nofollow');
 assert.doesNotMatch(await r.text(),/chat\.whatsapp\.com/);
});
