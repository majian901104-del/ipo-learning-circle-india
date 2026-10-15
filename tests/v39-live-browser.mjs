import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const SITE='https://angelresearchindia.com';
const WORKER='https://angel-research-conversion-v31.majian901104.workers.dev';
const pages=[
 {path:'/',label:'home',expected:'15 Oct 2026'},
 {path:'/ipo-current.html',label:'ipo-current',expected:'15 October 2026'},
 {path:'/ipo-jio-platforms.html',label:'jio',expected:'₹1,065–₹1,119'},
 {path:'/ipo-community.html',label:'community',expected:'JOIN FREE'},
 {path:'/about.html',label:'about',expected:'Angel Research'}
];
const widths=[{label:'mobile',width:390,height:844},{label:'desktop',width:1366,height:900}];
await fs.mkdir('screenshots',{recursive:true});
let passed=0,failed=0;
const browser=await chromium.launch({headless:true});
for(const v of widths){
 const ctx=await browser.newContext({viewport:{width:v.width,height:v.height},deviceScaleFactor:1,locale:'en-IN',
   isMobile:v.label==='mobile',hasTouch:v.label==='mobile'});
 for(const spec of pages){
  const page=await ctx.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   const resp=await page.goto(SITE+spec.path,{waitUntil:'domcontentloaded',timeout:35000});
   assert.equal(resp?.status(),200,'HTTP status');
   await page.waitForTimeout(1350);
   const text=await page.locator('body').innerText({timeout:5000});
   assert.ok(text.includes(spec.expected),spec.label+' expected '+spec.expected);
   const overflow=await page.evaluate(()=>({
    outer:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),
    viewport:window.innerWidth,
    currentIPO:document.querySelectorAll('.ipo-card').length,
    oldLinks:document.querySelectorAll('a[href*="cc.stockscode.click"]').length,
    ctas:Array.from(document.querySelectorAll('a[data-conversion-join]')).map(a=>a.href)
   }));
   assert.equal(overflow.oldLinks,0,'deprecated group links');
   assert.ok(overflow.outer<=overflow.viewport+8,
    'horizontal overflow: '+JSON.stringify(overflow));
   assert.ok(overflow.ctas.length>0,'missing signup CTA');
   assert.ok(overflow.ctas.every(x=>x.startsWith(WORKER+'/join')),'CTA bypasses registration');
   if(spec.label==='ipo-current')assert.equal(overflow.currentIPO,10,'current IPO card count');
   assert.deepEqual(errors,[],'browser JS errors: '+JSON.stringify(errors));
   await page.screenshot({path:'screenshots/'+spec.label+'-'+v.label+'.png',fullPage:false,animations:'disabled'});
   console.log('PASS '+spec.label+' '+v.label+' status='+resp.status()+' cards='+overflow.currentIPO+' scroll='+overflow.outer+'/'+overflow.viewport);
   passed++;
  }catch(error){failed++;console.error('FAIL '+spec.label+' '+v.label+' '+error.message);
   await page.screenshot({path:'screenshots/FAILED-'+spec.label+'-'+v.label+'.png',fullPage:false}).catch(()=>{});}
  finally{await page.close();}
 }
 await ctx.close();
}
await browser.close();
let rr=await fetch(WORKER+'/health');
assert.equal(rr.status,200);
const flags=await rr.json();
assert.equal(flags.inviteIndiaOnly,true);assert.equal(flags.ipDedupEnabled,true);
console.log('LIVE_FLAGS '+JSON.stringify({routeMode:flags.routeMode,indiaOnly:flags.inviteIndiaOnly,ipDedup:flags.ipDedupEnabled}));
rr=await fetch(WORKER+'/admin/leads',{headers:{Origin:SITE}});
assert.equal(rr.status,401);
console.log('ADMIN_PROTECTION HTTP '+rr.status);
console.log('BROWSER_RESULT '+JSON.stringify({passed,failed}));
if(failed)process.exitCode=1;
