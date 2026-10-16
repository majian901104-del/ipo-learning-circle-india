'use strict';
/* Fast production MOBILE route + form control checks without screenshots/images or PII */
const {chromium}=require('playwright');
(async()=>{
const browser=await chromium.launch({headless:true});
const failures=[],measurements=[];
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
 extraHTTPHeaders:{DNT:'1','Sec-GPC':'1'},timezoneId:'Asia/Kolkata',locale:'en-IN'});
await context.route('**/*',route=>route.request().resourceType()==='image'?route.abort():route.continue());
for(const p of [
{name:'home',path:'/?utm_source=x&utm_campaign=prelaunch_qa&utm_medium=paid_social'},
{name:'community',path:'/ipo-community.html'},
{name:'research',path:'/research.html'},
{name:'request',path:'/apply.html'},
{name:'privacy',path:'/privacy.html'},
{name:'contact',path:'/contact.html'}]){
const tab=await context.newPage();
try{
 const r=await tab.goto('https://angelresearchindia.com'+p.path,{waitUntil:'domcontentloaded',timeout:12000});
 const state=await tab.evaluate(()=>({
  title:document.title,h1:document.querySelector('main h1')?.textContent?.trim().slice(0,70),
  horizontalOverflow:document.documentElement.scrollWidth-innerWidth,
  cta:document.querySelector('a[data-conversion-join]')?.href,
  consent:!!document.querySelector('#leadForm input[name="consent"][required]'),
  hasResearchFilter:!!document.querySelector('#research-query')
 }));
 measurements.push({page:p.name,status:r?.status(),...state});
 if(r?.status()!==200)failures.push(p.name+' is HTTP '+r?.status());
 if(state.horizontalOverflow>4)failures.push(p.name+' mobile horizontal overflow '+state.horizontalOverflow);
 if(!state.h1)failures.push(p.name+' no H1');
 if(p.name==='home'){
  if(!state.cta?.includes('s=x')||!state.cta?.includes('c=prelaunch_qa')||!state.cta?.includes('m=paid_social'))
   failures.push('X campaign labels not passed to Worker join URL');
 }
 if(p.name==='community'&&!state.cta?.includes('/join'))failures.push('No community Worker CTA');
 if(p.name==='request'&&!state.consent)failures.push('Research request lacks required consent');
 if(p.name==='research'&&!state.hasResearchFilter)failures.push('Research search not mounted');
}catch(e){failures.push(p.name+': '+e.message.slice(0,220))}
finally{await tab.close()}
}
const worker=await context.request.get('https://angel-research-conversion-v31.majian901104.workers.dev/join',{maxRedirects:0,timeout:11000});
const payload=(await worker.text()).slice(0,4000);
measurements.push({page:'Worker join GET',status:worker.status(),geoRestricted:worker.status()===403&&payload.includes('India only'),registrationForm:worker.status()===200&&payload.includes('name="request_token"')});
if(![200,403].includes(worker.status()))failures.push('Worker GET unexpected status '+worker.status());
if(worker.status()===200&&!payload.includes('name="request_token"'))failures.push('Worker bypassed registration form');
console.log(JSON.stringify({pass:failures.length===0,measurements,failures,notTested:'D1 POST and WhatsApp group handoff require controlled in-country end-to-end test'},null,2));
await browser.close();
if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=2});
