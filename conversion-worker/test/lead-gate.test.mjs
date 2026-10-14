import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.mjs';
const ADMIN='test-only-not-an-operational-credential-560dbdbf06cab5eb548';
const DEST='https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv';
const ORIGIN='https://angelresearchindia.com';
function mock(){
 const leads=[],events=[],seen=new Set();
 const db={prepare(sql){
  let p=[];
  return {bind(...args){p=args;return this},
   async first(){
    if(sql.includes('FROM link_state'))return {active_url:DEST,standby_url:null,version:1};
    if(sql.includes('SELECT id FROM community_leads'))return leads[0]?{id:leads[0].id}:null;
    throw Error('Unexpected first '+sql)
   },
   async all(){
    if(sql.includes('FROM community_leads')){
     let rows=leads.slice().sort((a,b)=>b.id-a.id);
     if(sql.includes('WHERE id < ?'))rows=rows.filter(x=>x.id<p[0]);
     return {results:rows.slice(0,51)}
    }
    throw Error('Unexpected all '+sql)
   },
   async run(){
    if(sql.includes('INSERT OR IGNORE INTO community_leads')){
     if(seen.has(p[0]))return {meta:{changes:0}};
     seen.add(p[0]);
     leads.push({id:leads.length+1,request_nonce:p[0],full_name:p[1],whatsapp_number:p[2],
      source:p[3],campaign:p[4],medium:p[5],updates_opt_in:p[6],created_at:p[7]});
     return {meta:{changes:1}};
    }
    if(sql.startsWith('DELETE FROM community_leads WHERE id=')){
     const i=leads.findIndex(x=>x.id===p[0]);
     if(i<0)return {meta:{changes:0}};
     leads.splice(i,1);return {meta:{changes:1}};
    }
    throw Error('Unexpected run '+sql);
   }};
 }};
 const env={LINK_DB:db,LINK_ADMIN_KEY:ADMIN,LINK_DYNAMIC_TARGET_ENABLED:'true',JOIN_LEAD_FORM_ENABLED:'true',
 LINK_MODE_ENABLED:'false',ANALYTICS:{writeDataPoint(r){events.push(r)}}};
 return {env,leads,events};
}
const invitation=async env=>worker.fetch(new Request('https://worker.example/join?s=x&c=promotion42',{
 headers:{'Sec-Fetch-Mode':'navigate'}}),env);
async function token(env){
 const r=await invitation(env);
 assert.equal(r.status,200);
 assert.equal(r.headers.get('Cache-Control'),'no-store,private');
 assert.equal(r.headers.get('Location'),null);
 const html=await r.text();
 assert.ok(html.includes('name="full_name"'));
 assert.ok(html.includes('name="whatsapp"'));
 assert.ok(html.includes('name="updates_opt_in"'));
 assert.ok(!html.includes(DEST));
 return html.match(/name="request_token" value="([^"]+)"/)[1];
}
async function submit(env,nonce,phone='9876543210',name='Asha Patel',extra={}){
 const body=new URLSearchParams({request_token:nonce,full_name:name,whatsapp:phone,consent:'yes',...extra});
 return worker.fetch(new Request('https://worker.example/join?s=x&c=promotion42',{
  method:'POST',headers:{Origin:'https://worker.example','Content-Type':'application/x-www-form-urlencoded'},
  body:body.toString()
 }),env);
}
async function login(env){
 const r=await worker.fetch(new Request('https://worker.example/admin/session',{
  method:'POST',headers:{Origin:ORIGIN,'Content-Type':'application/json'},body:JSON.stringify({key:ADMIN})
 }),env);
 assert.equal(r.status,200);
 return (await r.json()).token
}
test('opt-in OFF keeps old D1 dynamic 302 flow exactly as before',async()=>{
 const {env}=mock();env.JOIN_LEAD_FORM_ENABLED='false';
 const r=await invitation(env);assert.equal(r.status,302);assert.equal(r.headers.get('Location'),DEST);
});
test('GET /join renders mobile English registration and never exposes invitation or phone via URL',async()=>{
 const {env}=mock(),t=await token(env);assert.match(t,/^l37\./);
 const h=await worker.fetch(new Request('https://worker.example/health'),env);
 assert.equal((await h.json()).leadFormEnabled,true);
});
test('required fields & consent saved in private D1, then WhatsApp 303',async()=>{
 const {env,leads,events}=mock();
 const t=await token(env);const result=await submit(env,t,'9876543210','Asha Patel');
 assert.equal(result.status,303);assert.equal(result.headers.get('Location'),DEST);
 assert.equal(leads.length,1);assert.equal(leads[0].whatsapp_number,'+919876543210');
 assert.equal(leads[0].full_name,'Asha Patel');assert.equal(leads[0].updates_opt_in,0);
 assert.equal(leads[0].source,'x');assert.equal(leads[0].campaign,'promotion42');
 assert.equal(events.length,1);assert.equal(events[0].blobs[0],'join_click');
 assert.equal(JSON.stringify(events).includes('Asha'),false);
 assert.equal(JSON.stringify(events).includes('9876543210'),false);
});
test('same form token cannot be used twice; new form permits repeat visitor registration',async()=>{
 const {env,leads}=mock();const t=await token(env);
 assert.equal((await submit(env,t)).status,303);
 const repeat=await submit(env,t);
 assert.equal(repeat.status,400);assert.equal(repeat.headers.get('Location'),null);assert.equal(leads.length,1);
 const fresh=await token(env);assert.equal((await submit(env,fresh)).status,303);
 assert.equal(leads.length,2);
});
test('invalid phone, missing privacy consent, spoofed origin and cross-site direct POST never redirect',async()=>{
 const {env,leads}=mock(),t=await token(env);
 for(const phone of ['5555555555','1234','+919876543210','0000000000']){
  assert.equal((await submit(env,t,phone)).status,400);
 }
 const noConsent=await submit(env,t,'9876543210','Asha',{consent:'no'});
 assert.equal(noConsent.status,400);
 const spoof=await worker.fetch(new Request('https://worker.example/join',{method:'POST',
  headers:{Origin:'https://attacker.example','Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({request_token:t,full_name:'Asha',whatsapp:'9876543210',consent:'yes'}).toString()
 }),env);
 assert.equal(spoof.status,400);assert.equal(leads.length,0);
});
test('admin lead record viewing and deletion require authenticated V3.5 session',async()=>{
 const {env,leads}=mock();
 const t=await token(env);
 assert.equal((await submit(env,t,'9876543210','Asha Patel',{updates_opt_in:'yes'})).status,303);
 assert.equal((await worker.fetch(new Request('https://worker.example/admin/leads',{headers:{Origin:ORIGIN}}),env)).status,401);
 assert.equal((await worker.fetch(new Request('https://worker.example/admin/leads',{headers:{Origin:'https://attacker.example'}}),env)).status,403);
 const bearer=await login(env);
 const headers={Origin:ORIGIN,Authorization:'Bearer '+bearer};
 const res=await worker.fetch(new Request('https://worker.example/admin/leads',{headers}),env);
 assert.equal(res.status,200);
 const json=await res.json();
 assert.equal(json.leads.length,1);assert.equal(json.leads[0].updates_opt_in,1);
 const id=json.leads[0].id;
 const deleted=await worker.fetch(new Request('https://worker.example/admin/leads/'+id,{method:'DELETE',headers}),env);
 assert.equal(deleted.status,200);assert.equal((await deleted.json()).deleted,true);
 assert.equal(leads.length,0);
});
test('missing D1 migration makes registration fail closed, not leak invitation URL or collect PII',async()=>{
 const {env}=mock();env.LINK_DB={prepare(){throw Error('missing_table')}};
 const get=await invitation(env);assert.equal(get.status,503);
 assert.equal(get.headers.get('Location'),null);
});
test('non-navigation prefetch does not generate a form nor count clicks',async()=>{
 const {env,events}=mock();
 const r=await worker.fetch(new Request('https://worker.example/join',{
  headers:{'Sec-Fetch-Mode':'no-cors'}
 }),env);
 assert.equal(r.status,403);assert.equal(events.length,0);
});
