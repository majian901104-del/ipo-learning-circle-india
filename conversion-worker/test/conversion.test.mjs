import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/index.mjs';

function setup(){
 const records=[];
 return {records,env:{
  ANALYTICS:{writeDataPoint(row){records.push(row)}},
  COMMUNITY_DESTINATION:'https://cc.stockscode.click'
 }};
}
test('POST from trusted website records only aggregate dimensions',async()=>{
 const {records,env}=setup();
 const req=new Request('https://worker.example/collect',{
  method:'POST',headers:{Origin:'https://angelresearchindia.com','Content-Type':'text/plain'},
  body:JSON.stringify({event:'page_view',path:'/ipo-community.html',
    source:'x',campaign:'gurjot_ipo',medium:'influencer',phone:'12345678'})
 });
 const res=await worker.fetch(req,env);
 assert.equal(res.status,204);assert.equal(records.length,1);
 assert.deepEqual(records[0].blobs.slice(0,5),
  ['page_view','/ipo-community.html','gurjot_ipo','x','influencer']);
 assert.equal(records[0].blobs.join('|').includes('12345678'),false);
 assert.deepEqual(records[0].doubles,[1]);
});
test('External origin cannot submit aggregate events',async()=>{
 const {records,env}=setup();
 const req=new Request('https://worker.example/collect',{
   method:'POST',headers:{Origin:'https://other.example','Content-Type':'text/plain'},
   body:JSON.stringify({event:'page_view',path:'/'})
 });
 assert.equal((await worker.fetch(req,env)).status,403);assert.equal(records.length,0);
});
test('Unsupported event is not counted',async()=>{
 const {records,env}=setup();
 const req=new Request('https://worker.example/collect',{method:'POST',
  headers:{Origin:'https://angelresearchindia.com'},
  body:JSON.stringify({event:'track_user',path:'/'})});
 assert.equal((await worker.fetch(req,env)).status,400);assert.equal(records.length,0);
});
test('GET redirect records one aggregate join and never forwards input URL',async()=>{
 const {records,env}=setup();
 const req=new Request('https://worker.example/join?c=gurjot_ipo&s=x&m=influencer&destination=https://evil.example',{
 headers:{'Sec-Fetch-Mode':'navigate'}});
 const res=await worker.fetch(req,env);
 assert.equal(res.status,302);
 assert.equal(res.headers.get('Location'),'https://cc.stockscode.click');
 assert.equal(records.length,1);assert.equal(records[0].blobs[0],'join_click');
 assert.equal(records[0].blobs[2],'gurjot_ipo');
});
test('DNT and GPC prevent recording while redirect still functions',async()=>{
 const {records,env}=setup();
 const dnt=new Request('https://worker.example/join?c=abc',{headers:{DNT:'1'}});
 assert.equal((await worker.fetch(dnt,env)).status,302);
 assert.equal(records.length,0);
 const gpc=new Request('https://worker.example/collect',{method:'POST',
 headers:{Origin:'https://angelresearchindia.com','Sec-GPC':'1'},
 body:JSON.stringify({event:'page_view',path:'/'})});
 assert.equal((await worker.fetch(gpc,env)).status,204);
 assert.equal(records.length,0);
});
test('Failed dataset binding does not break the external link',async()=>{
 const {env}=setup();delete env.ANALYTICS;
 const req=new Request('https://worker.example/join?c=direct');
 const res=await worker.fetch(req,env);
 assert.equal(res.status,302);
 assert.equal(res.headers.get('Location'),'https://cc.stockscode.click');
});


const reportSecret='local-test-owner-private-key-0123456789012345';
function reportEnv(){
 const queries=[];
 return {queries,env:{
   ...setup().env,
   REPORT_ACCESS_KEY:reportSecret,
   ANALYTICS_SQL:{
     async query(options){
       queries.push(options);
       if(options.query.includes('blob3 AS campaign')){
         return {data:[
           {campaign:'gurjot_ipo',source:'x',event:'page_view',total:25},
           {campaign:'gurjot_ipo',source:'x',event:'join_click',total:8},
           {campaign:'direct',source:'direct',event:'page_view',total:4}
         ]};
       }
       if(options.query.includes('toDate(timestamp) AS day')){
         return {data:[
           {day:'2026-10-13',event:'page_view',total:29},
           {day:'2026-10-13',event:'join_click',total:8}
         ]};
       }
       return {data:[{country:'IN',event:'page_view',total:27},
         {country:'MY',event:'page_view',total:2}]};
     }
   }
 }};
}
function reportRequest(key,origin='https://angelresearchindia.com',days=7){
 const headers={Origin:origin};
 if(key!==null)headers.Authorization='Bearer '+key;
 return new Request('https://worker.example/report?days='+days,{headers});
}
test('V3.2 report requires configured server-side access key',async()=>{
 const {env}=reportEnv();delete env.REPORT_ACCESS_KEY;
 const res=await worker.fetch(reportRequest(reportSecret),env);
 assert.equal(res.status,503);assert.equal((await res.json()).error,'reporting_not_configured');
});
test('V3.2 report rejects missing, wrong and short keys',async()=>{
 const {env,queries}=reportEnv();
 for(const key of [null,'wrong-key','']){
   const res=await worker.fetch(reportRequest(key),env);
   assert.equal(res.status,401);
 }
 assert.equal(queries.length,0);
});
test('V3.2 report blocks other origins and no longer permits query after rejection',async()=>{
 const {env,queries}=reportEnv();
 assert.equal((await worker.fetch(reportRequest(reportSecret,'https://attacker.example'),env)).status,403);
 assert.equal(queries.length,0);
});
test('V3.2 report aggregates source campaign daily and countries with owner key',async()=>{
 const {env,queries}=reportEnv();
 const res=await worker.fetch(reportRequest(reportSecret),env);
 assert.equal(res.status,200);
 assert.equal(res.headers.get('Access-Control-Allow-Origin'),'https://angelresearchindia.com');
 assert.equal(res.headers.get('Cache-Control'),'no-store, private');
 const body=await res.json();
 assert.equal(body.ok,true);assert.deepEqual(body.totals,{views:29,redirects:8});
 assert.deepEqual(body.campaigns[0],{source:'x',campaign:'gurjot_ipo',views:25,redirects:8});
 assert.equal(body.daily[0].views,29);
 assert.equal(body.countries[0].country,'IN');
 assert.equal(queries.length,3);
 assert.ok(queries.every(q=>q.query.includes('events.analyticsEngine.angel_research_conversion_v31')));
 assert.ok(queries.every(q=>q.params.start.endsWith('Z')));
});
test('V3.2 report rejects invalid day selections and does not reveal raw SQL errors',async()=>{
 const {env,queries}=reportEnv();
 assert.equal((await worker.fetch(reportRequest(reportSecret,'https://angelresearchindia.com',365),env)).status,400);
 env.ANALYTICS_SQL.query=async()=>{throw new Error('private internal database credentials')};
 const res=await worker.fetch(reportRequest(reportSecret),env);
 assert.equal(res.status,502);
 assert.equal(JSON.stringify(await res.json()).includes('credentials'),false);
 assert.equal(queries.length,0);
});
test('V3.2 report CORS preflight allows Authorization on trusted domain',async()=>{
 const {env}=reportEnv();
 const req=new Request('https://worker.example/report',{method:'OPTIONS',headers:{Origin:'https://angelresearchindia.com'}});
 const res=await worker.fetch(req,env);
 assert.equal(res.status,204);
 assert.equal(res.headers.get('Access-Control-Allow-Headers'),'Authorization');
});
