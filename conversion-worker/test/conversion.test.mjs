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
       if(options.query.includes("blob6 = 'in'")){
         return {data:[{campaign:'gurjot_ipo',source:'x',event:'page_view',total:20},
           {campaign:'gurjot_ipo',source:'x',event:'join_click',total:6}]};
       }
       if(options.query.includes('blob3 AS campaign')){
         return {data:[
           {campaign:'gurjot_ipo',source:'x',event:'page_view',total:25},
           {campaign:'gurjot_ipo',source:'x',event:'join_click',total:8},
           {campaign:'direct',source:'direct',event:'page_view',total:4}
         ]};
       }
       if(options.query.includes('blob7 AS device')){
         return {data:[
           {device:'mobile',os:'android',model:'pixel_8',event:'page_view',total:5},
           {device:'desktop',os:'windows',model:'unknown',event:'page_view',total:2}
         ]};
       }
       if(options.query.includes('toDate(timestamp) AS day')){
         return {data:[
           {day:'2026-10-13',event:'page_view',total:29},
           {day:'2026-10-13',event:'join_click',total:8}
         ]};
       }
       return {data:[{country:'IN',region:'MH',event:'page_view',total:27},
         {country:'MY',region:'14',event:'page_view',total:2}]};
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
 assert.equal(body.ok,true);assert.deepEqual(body.totals,{views:29,redirects:8,visitorSessions:0,clickSessions:0});
 assert.deepEqual(body.campaigns[0],{source:'x',campaign:'gurjot_ipo',views:25,redirects:8,visitorSessions:0,clickSessions:0,indiaViews:20,indiaRedirects:6});
 assert.equal(body.daily[0].views,29);
 assert.equal(body.countries[0].country,'IN');
 assert.equal(body.regions[0].region,'MH');
 assert.equal(body.devices[0].os,'android');
 assert.equal(body.models[0].model,'pixel_8');
 assert.equal(queries.length,5);
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

test('V3.2.1 new tab session event counts are separate from raw click requests',async()=>{
 const {env,records}=setup();
 const request=new Request('https://worker.example/collect',{method:'POST',
  headers:{Origin:'https://angelresearchindia.com','Content-Type':'text/plain'},
  body:JSON.stringify({event:'page_view',firstSession:true,path:'/ipo-community.html',
   source:'x',campaign:'gurjot_ipo',medium:'influencer',device:'mobile',os:'android',model:'pixel 8'})
 });
 assert.equal((await worker.fetch(request,env)).status,204);
 assert.deepEqual(records.map(r=>r.blobs[0]),['page_view','page_session']);
 assert.equal(records[0].blobs[6],'mobile');
 assert.equal(records[0].blobs[7],'android');
 assert.equal(records[0].blobs[8],'pixel_8');
 assert.equal(records[0].blobs[5],'unk');
 const link=new Request('https://worker.example/join?c=gurjot_ipo&s=x&m=influencer&u=1&d=mobile&o=android&model=pixel_8',{headers:{'Sec-Fetch-Mode':'navigate'}});
 assert.equal((await worker.fetch(link,env)).status,302);
 assert.deepEqual(records.map(r=>r.blobs[0]),['page_view','page_session','join_click','join_session']);
});
test('V3.2.1 old page and join calls remain backwards-compatible and do not fabricate sessions',async()=>{
 const {env,records}=setup();
 const a=new Request('https://worker.example/collect',{method:'POST',
  headers:{Origin:'https://angelresearchindia.com'},
  body:JSON.stringify({event:'page_view',path:'/',source:'direct'})});
 await worker.fetch(a,env);
 await worker.fetch(new Request('https://worker.example/join?c=direct'),env);
 assert.deepEqual(records.map(r=>r.blobs[0]),['page_view','join_click']);
});
test('V3.2.1 only opt-in client sends model; report hides rare model groups',async()=>{
 const {env}=reportEnv();
 env.ANALYTICS_SQL.query=async(options)=>{
   if(options.query.includes('blob7 AS device'))return {data:[
     {device:'mobile',os:'android',model:'rare_android',event:'page_view',total:1},
     {device:'mobile',os:'ios',model:'unknown',event:'page_view',total:4}
   ]};
   return {data:[]};
 };
 const body=await (await worker.fetch(reportRequest(reportSecret),env)).json();
 assert.equal(body.ok,true);
 assert.equal(body.models.length,0);
 assert.equal(body.devices.length,2);
 assert.deepEqual(body.totals,{views:0,redirects:0,visitorSessions:0,clickSessions:0});
});

test('V3.2.2 exclusion is a fixed SQL clause applied consistently across all report queries',async()=>{
 const {env,queries}=reportEnv();
 const res=await worker.fetch(new Request('https://worker.example/report?days=7&exclude_test=1',{
  headers:{Origin:'https://angelresearchindia.com',Authorization:'Bearer '+reportSecret}}),env);
 assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.excludeTest,true);
 assert.equal(queries.length,5);
 assert.ok(queries.every(q=>q.query.includes("blob3 NOT LIKE 'test%'")));
 assert.ok(queries.some(q=>q.query.includes("blob6 = 'in'")));
 const {env:other,queries:queriesAll}=reportEnv();
 const req=await worker.fetch(reportRequest(reportSecret),other);
 assert.equal(req.status,200);
 assert.ok(queriesAll.every(q=>!q.query.includes("blob3 NOT LIKE 'test%'")));
});
test('V3.2.2 cost attribution data never enters worker or the public response',async()=>{
 const {env}=reportEnv();
 const data=await (await worker.fetch(reportRequest(reportSecret),env)).json();
 assert.equal(data.campaigns[0].indiaViews,20);
 assert.equal(data.campaigns[0].indiaRedirects,6);
 assert.equal(Object.hasOwn(data.campaigns[0],'spend'),false);
 assert.equal(Object.hasOwn(data.campaigns[0],'realJoins'),false);
});
