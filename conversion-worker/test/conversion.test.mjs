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
