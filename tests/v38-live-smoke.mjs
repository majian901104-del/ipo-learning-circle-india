import assert from 'node:assert/strict';
import process from 'node:process';

// Network-only smoke probes: GET requests only. No visitor registration,
// personal data, database mutations, tracking clicks, or WhatsApp opens.
const WORKER='https://angel-research-conversion-v31.majian901104.workers.dev';
const WEBSITE='https://angelresearchindia.com';
let failed=0,checked=0;
async function probe(label,url,callback,extra={}){
  checked++;
  try{
    const r=await fetch(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(16000),
      cache:'no-store',headers:{'User-Agent':'AngelResearch-V38-readonly-CI-QA/1.0',...extra}});
    const body=await r.text();
    await callback(r,body);
    console.log('PASS '+label+' | HTTP '+r.status);
  }catch(e){failed++;console.error('FAIL '+label+' | '+String(e.message||e).slice(0,300))}
}
let health=null;
await probe('Live /health status, feature flags and DB binding',WORKER+'/health',async(r,body)=>{
 assert.equal(r.status,200,'/health must be HTTP 200');
 const d=JSON.parse(body);health=d;
 assert.equal(d.status,'ok');
 assert.equal(d.routeMode,'dynamic_primary');
 assert.equal(d.leadFormEnabled,true);
 assert.equal(d.linkDatabaseConnected,true);
 assert.equal(d.inviteIndiaOnly,true);
 assert.equal(d.ipDedupEnabled,true);
 assert.equal(d.ipDedupReady,true);
 assert.equal(d.ipDedupWindowHours,24);
 assert.equal(d.ipDedupScope,'statistics_only');
 assert.equal(d.socialSourcePolicy,'observe');
 // Never show keys, phone numbers or admin sessions in health.
 assert.equal(JSON.stringify(d).includes('LINK_ADMIN_KEY'),false);
 console.log('LIVE FLAGS '+JSON.stringify({
  routeMode:d.routeMode,leadFormEnabled:d.leadFormEnabled,
  linkDatabaseConnected:d.linkDatabaseConnected,inviteIndiaOnly:d.inviteIndiaOnly,
  ipDedupEnabled:d.ipDedupEnabled,ipDedupReady:d.ipDedupReady,
  ipDedupWindowHours:d.ipDedupWindowHours,socialSourcePolicy:d.socialSourcePolicy
 }));
}, {'Origin':WEBSITE});
await probe('Public /health CORS allowlisting',WORKER+'/health',async(r)=>{
 assert.equal(r.status,200);
 assert.equal(r.headers.get('access-control-allow-origin'),WEBSITE);
},{Origin:WEBSITE});
await probe('India-only /join GET blocks non-Indian cloud runners',WORKER+'/join',async(r,body)=>{
 if(r.status===403){
   assert.match(body,/India only|visitors in India/i);
   assert.equal(r.headers.get('location'),null);
   assert.doesNotMatch(body,/name="full_name"|chat\.whatsapp\.com/);
   console.log('JOIN GEO: blocked (403) from runner; this tests non-IN rule, not IN registration');
 }else if(r.status===200){
   assert.match(body,/name="full_name"/);
   assert.match(body,/name="whatsapp"/);
   console.log('JOIN GEO: runner classified IN; registration form loads (200). No data submitted.');
 }else{
   throw Error('unexpected /join status '+r.status+' body='+body.slice(0,150));
 }
});
await probe('Private customer API inaccessible without admin session',WORKER+'/admin/leads',async(r)=>{
 assert.ok([401,403].includes(r.status),'must return 401 or 403; got '+r.status);
 assert.equal(r.headers.get('location'),null);
},{Origin:WEBSITE});
await probe('Public static admin shell contains updated V3.8 status display',WEBSITE+'/analytics-dashboard.html',async(r,body)=>{
 if([301,302,307,308].includes(r.status)){throw Error('unexpected dashboard redirect '+r.status)}
 assert.equal(r.status,200);
 assert.match(body,/VERSION 3\.8/);
 assert.match(body,/id="ops-india-geo-status"/);
 assert.match(body,/data-admin-view="leads"/);
});
await probe('Published privacy contact for deletion requests',WEBSITE+'/privacy.html',async(r,body)=>{
 assert.equal(r.status,200);
 assert.match(body,/support@angelresearchindia\.com/);
});
console.log('RESULT '+JSON.stringify({checked,passed:checked-failed,failed}));
if(failed)process.exitCode=1;
