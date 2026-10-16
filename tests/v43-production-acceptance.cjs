'use strict';
/* Read-only real production smoke test. NO form POST, NO customer PII, NO WhatsApp follow-through.
 * Country-policy checks use the runner's actual network, not an invented Indian IP. */
const { chromium } = require('playwright');
const fs=require('node:fs'),path=require('node:path');
const OUT=path.resolve('prelaunch-report');
fs.mkdirSync(OUT,{recursive:true});
const site='https://angelresearchindia.com';
const worker='https://angel-research-conversion-v31.majian901104.workers.dev';
const pages=[
 ['home','/','Institutional thinking'],
 ['research','/research.html','Research'],
 ['ipo','/ipo-current.html','IPO'],
 ['community','/ipo-community.html','IPO'],
 ['privacy','/privacy.html','Privacy'],
 ['request','/apply.html','research updates']
];
const statuses=[],failures=[],warnings=[];
const assert=(cond,msg)=>{if(!cond)failures.push(msg)};
function short(e){return String(e?.message||e).slice(0,300)}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const vp of [
  {name:'desktop',width:1440,height:900,mobile:false},
  {name:'mobile360',width:360,height:780,mobile:true}
 ]){
  const context=await browser.newContext({
   viewport:{width:vp.width,height:vp.height},isMobile:vp.mobile,hasTouch:vp.mobile,
   deviceScaleFactor:vp.mobile?2:1,locale:'en-IN',timezoneId:'Asia/Kolkata',
   extraHTTPHeaders:{DNT:'1','Sec-GPC':'1'}
  });
  for(const [name,route,expected] of pages){
   const page=await context.newPage(),jsErrors=[];
   page.on('pageerror',err=>jsErrors.push(short(err)));
   const started=Date.now();
   let response;
   try{
    const uri=site+route+(name==='home'?'?utm_source=facebook&utm_campaign=prelaunch_qa&utm_medium=paid_social':'');
    response=await page.goto(uri,{waitUntil:'domcontentloaded',timeout:14000});
    const status=response?.status()||0;
    await page.waitForTimeout(350);
    if(name==='home'||name==='community')await page.evaluate(async()=>{
      const imgs=Array.from(document.querySelectorAll('main img')).filter(i=>i.getBoundingClientRect().top<innerHeight+500);
      await Promise.race([
        Promise.all(imgs.map(img=>new Promise(resolve=>{
          if(img.complete)return resolve();
          img.addEventListener('load',resolve,{once:true});
          img.addEventListener('error',resolve,{once:true});
        }))),
        new Promise(resolve=>setTimeout(resolve,4500))
      ]);
    });
    const details=await page.evaluate(()=>({
     title:document.title,heading:document.querySelector('h1')?.innerText||'',
     viewport:innerWidth,scroll:document.documentElement.scrollWidth,
     overflow:document.documentElement.scrollWidth>innerWidth+4,
     heroImages:Array.from(document.querySelectorAll('main img')).filter(i=>i.getBoundingClientRect().top<innerHeight+500).map(i=>({
       alt:i.alt,done:i.complete,loaded:i.complete&&i.naturalWidth>0,source:(i.currentSrc||i.src||'').slice(0,130)})),
     cta:document.querySelector('a[data-conversion-join]')?.href||null,
     h1Count:document.querySelectorAll('main h1').length,
     mobileNav:document.querySelector('.v40-mobile details,.v40-mobile')?true:false,
     form:!!document.querySelector('#leadForm'),
     legalLinks:['privacy.html','terms.html'].map(p=>({p,found:!!document.querySelector('a[href*="'+p+'"]')}))
    }));
    const rec={viewport:vp.name,page:name,path:route,status,ms:Date.now()-started,...details,jsErrors};
    statuses.push(rec);
    assert(status===200,name+' '+vp.name+': live website returned HTTP '+status);
    assert(details.heading.toLowerCase().includes(expected.toLowerCase()),name+' '+vp.name+': unexpected heading '+details.heading.slice(0,65));
    assert(!details.overflow,name+' '+vp.name+': horizontal overflow '+(details.scroll-details.viewport)+'px');
    assert(details.h1Count===1,name+' '+vp.name+': expected one page heading, got '+details.h1Count);
    if(jsErrors.length)failures.push(name+' '+vp.name+': '+jsErrors.join('; '));
    for(const img of details.heroImages){
      if(!img.loaded)warnings.push(name+' '+vp.name+': above-fold photo unavailable '+img.source);
    }
    if(name==='home'){
      assert(details.cta?.startsWith(worker+'/join'),vp.name+': homepage signup CTA not routed to Worker');
      assert(details.cta?.includes('s=facebook'),vp.name+': campaign source missing from registration');
      assert(details.cta?.includes('c=prelaunch_qa'),vp.name+': campaign name missing from registration');
      assert(details.cta?.includes('m=paid_social'),vp.name+': campaign medium missing from registration');
      const paths=await page.locator('.v43-paths>a').count();
      assert(paths===3,vp.name+': homepage public paths count '+paths);
    }
    if(name==='community'){
      assert(details.cta?.startsWith(worker+'/join'),vp.name+': community signup CTA not routed to Worker');
      assert((await page.locator('a[data-conversion-join]').count())>=2,vp.name+': community has missing CTA');
    }
    if(name==='request'){
      const form=await page.locator('#leadForm').count();
      assert(form===1,vp.name+': separate research request form absent');
      const consent=await page.locator('#leadForm input[name="consent"][required]').count();
      assert(consent===1,vp.name+': research consent not required');
      const btn=await page.locator('#submitBtn').count();
      assert(btn===1,vp.name+': research request button missing');
      // Never fill or submit personal details into production.
    }
    if(name==='privacy'){
      const body=await page.locator('main').innerText();
      assert(body.includes('support@angelresearchindia.com'),vp.name+': privacy contact missing');
      assert(body.includes('Cloudflare D1'),vp.name+': storage disclosure missing');
    }
    if((name==='home'||name==='community')&&vp.mobile || name==='home'&&!vp.mobile){
      await page.screenshot({path:path.join(OUT,name+'-'+vp.name+'.png'),fullPage:false,animations:'disabled',timeout:10000});
    }
   }catch(e){
    failures.push(name+' '+vp.name+': '+short(e));
    statuses.push({viewport:vp.name,page:name,status:response?.status()||0,error:short(e)});
   }finally{await page.close();}
  }
  await context.close();
 }
 // The public status endpoint contains coarse feature flags only and no secrets or personal data.
 const api=await browser.newContext({extraHTTPHeaders:{DNT:'1','Sec-GPC':'1'}});
 try{
  const health=await api.request.get(worker+'/health',{timeout:16000});
  const h=health.ok()?await health.json():null;
  statuses.push({kind:'worker-health',status:health.status(),health:h});
  assert(health.status()===200,'Cloudflare Worker health HTTP '+health.status());
  if(h){
   assert(h.status==='ok','Worker health not OK');
   assert(h.leadFormEnabled===true,'Worker registration feature disabled');
   assert(h.linkDatabaseConnected===true,'Worker registration database disconnected');
   assert(h.routeMode==='dynamic_primary','Worker destination not dynamic-primary');
   assert(h.ipDedupEnabled===true,'Worker aggregate IP dedup is off');
   assert(h.ipDedupReady===true,'Worker IP dedup storage is not ready');
   assert(h.inviteIndiaOnly===true,'Worker India-only setting not enabled');
  }
 }catch(e){failures.push('Worker health unavailable: '+short(e))}
 try{
  // GET only: never POST a registration and never follow a WhatsApp invite.
  const resp=await api.request.get(worker+'/join?s=facebook&c=prelaunch_qa&m=paid_social',{timeout:16000,maxRedirects:0});
  const code=resp.status();
  let body=(await resp.text()).slice(0,15000);
  statuses.push({kind:'worker-join-GET',status:code,formVisible:body.includes('name="request_token"'),geoRestriction:body.includes('India only'),redirect:resp.headers()['location']?'REDACTED':null});
  assert([200,403].includes(code),'Join GET unexpected HTTP '+code);
  if(code===200){
   for(const term of ['name="request_token"','name="full_name"','name="whatsapp"','name="consent"','name="updates_opt_in"'])
    assert(body.includes(term),'Worker GET registration missing '+term);
   assert(!resp.headers()['location'],'Worker bypasses registration via redirect');
  }
  if(code===403){
   if(!body.toLowerCase().includes('india only'))warnings.push('Worker 403 does not clearly identify geographic restriction');
   warnings.push('GitHub Actions runner is not an Indian residential/mobile network: real India-only registration and handoff remain unverified');
  }
 }catch(e){failures.push('Worker join GET unavailable: '+short(e))}
 await api.dispose();
 await browser.close();
 const result={testedAt:new Date().toISOString(),testType:'READ_ONLY_PRODUCTION_ACCESS_FROM_GITHUB_RUNNER',site,regions:'Runner location unknown; locale and device simulation do not change public IP',pass:failures.length===0,criticalIssues:failures,warnings,checks:statuses,
  notTested:['Live Indian mobile carrier IP','Submitting user consent/lead to production D1','Real WhatsApp membership and invitation delivery','Production admin analytics reconciliation','Real-device network Core Web Vitals','Facebook or X ads platform attribution']};
 fs.writeFileSync(path.join(OUT,'acceptance.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({pass:result.pass,failures,warnings,checks:statuses.map(x=>({viewport:x.viewport,page:x.page,status:x.status,ms:x.ms,overflow:x.overflow,heroImages:x.heroImages?.length,brokenAboveFold:x.heroImages?.filter(i=>!i.loaded).length,kind:x.kind,health:x.health}))},null,2));
 if(failures.length)process.exitCode=1;
})().catch(e=>{fs.writeFileSync(path.join(OUT,'crash.txt'),short(e));console.error(e);process.exitCode=2});
