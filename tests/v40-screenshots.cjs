'use strict';
const { chromium }=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
const browser=await chromium.launch({headless:true});
const base='http://127.0.0.1:4173';
const out='v40-preview';
fs.mkdirSync(out,{recursive:true});
const routes=[
 ['home','index.html'],['collaboration','company-background.html'],['ipo-calendar','ipo-current.html'],['about','about.html'],['research','research.html'],['source-ledger','ipo-data-quality.html'],['issuer-profile','ipo-company.html?issue=hd-fire-protect'],['research-framework','research-framework.html']
];
let errors=[];
for(const viewport of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}]){
const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1});
for(const [label,route] of routes){
try{
if(label==='ipo-calendar'){
  await page.route('**/data/sebi-public-issue-filings.json',async route=>{
    const feed={schemaVersion:'4.2',feedType:'official-public-document-index',publisher:'Securities and Exchange Board of India (SEBI)',sourceUrl:'https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&smid=11&ssid=15',fetchedAtUtc:new Date().toISOString(),recordCount:2,records:[
      {filingDate:'2026-10-15',title:'Jio Platforms Limited – RHP',documentType:'rhp',sebiPageUrl:'https://www.sebi.gov.in/filings/public-issues/oct-2026/jio-platforms-limited-rhp_105274.html',evidenceType:'official-filing-index'},
      {filingDate:'2026-10-13',title:'Zetwerk Manufacturing Businesses Limited – RHP',documentType:'rhp',sebiPageUrl:'https://www.sebi.gov.in/filings/public-issues/oct-2026/zetwerk-manufacturing-businesses-limited-rhp_105195.html',evidenceType:'official-filing-index'}]
    };
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(feed)});
  });
  console.log('IPO watch preview uses a mocked two-record SEBI response; live fetch is tested separately by source QA');
}
const resp=await page.goto(base+'/'+route,{waitUntil:'domcontentloaded',timeout:25000});
if(!resp||resp.status()!==200)throw Error('HTTP '+resp?.status());
await page.locator('.v40-header').waitFor({state:'visible',timeout:10000});
await page.evaluate(async()=>{
  const imgs=[...document.images].filter(img=>img.getBoundingClientRect().top<window.innerHeight+400);
  await Promise.race([
    Promise.all(imgs.map(img=>new Promise(resolve=>{
      if(img.complete)return resolve();
      img.addEventListener('load',resolve,{once:true});
      img.addEventListener('error',resolve,{once:true});
    }))),
    new Promise(resolve=>setTimeout(resolve,9000))
  ]);
});
const imgStats=await page.evaluate(()=>[...document.images].filter(img=>img.getBoundingClientRect().top<window.innerHeight+400).map(img=>({alt:img.alt,loaded:img.complete&&img.naturalWidth>0})));
console.log('visible images:',label,viewport.name,JSON.stringify(imgStats));
await page.screenshot({path:path.join(out,label+'-'+viewport.name+'.png'),fullPage:true,animations:'disabled',timeout:25000});
const metrics=await page.evaluate(()=>({
 scrollWidth:document.documentElement.scrollWidth,
 viewport:window.innerWidth,
 hasMain:!!document.querySelector('main'),
 hasJoin:!!document.querySelector('a[data-conversion-join]'),
 heading:document.querySelector('h1')?.textContent?.trim().slice(0,90),
 mobileMenu:(()=>{let x=document.querySelector('.v40-mobile summary');return x?getComputedStyle(x.closest('details')).display:null})()
}));
console.log(label,viewport.name,JSON.stringify(metrics));
if(!metrics.hasMain||!metrics.hasJoin)errors.push(label+' '+viewport.name+': missing main or registration CTA');
if(metrics.scrollWidth>metrics.viewport+4)errors.push(label+' '+viewport.name+': horizontal overflow by '+(metrics.scrollWidth-metrics.viewport)+'px');
if(viewport.name==='mobile'&&metrics.mobileMenu==='none')errors.push(label+': mobile nav hidden');
if(label==='research'){
  const input=page.locator('#research-query');
  await input.fill('SRIT');
  const shown=await page.locator('.research-visual-card:visible').count();
  if(shown!==1)errors.push('research search expected one SRIT report; got '+shown);
  await input.fill('');
  await page.locator('.dbchip[data-filter="WEEKLY"]').click();
  const weekly=await page.locator('.research-visual-card:visible').count();
  if(weekly!==1)errors.push('research weekly filter expected one report; got '+weekly);
}
if(label==='research-framework'){
  const sections=await page.locator('.v41-framework-grid article').count();
  if(sections!==9)errors.push('Research framework should contain nine quality controls, got '+sections);
}
if(label==='source-ledger'){
  await page.locator('.v421-company').first().waitFor({state:'visible',timeout:8500});
  const crosscheck=await page.locator('.v421-company').count();
  if(crosscheck!==10)errors.push('Expected 10 independently labelled IPO crosscheck cards, got '+crosscheck);
  const pending=await page.locator('[data-exchange-status]').innerText();
  if(!pending.includes('No licensed NSE/BSE feed connected'))errors.push('Exchange permission status not clearly disclosed');
  const jio=await page.locator('.v421-company').filter({hasText:'Jio Platforms'}).innerText();
  if(!jio.includes('SEBI DOCUMENT FOUND'))errors.push('Jio actual SEBI RHP index filing not matched');
  if(!jio.includes('Not verified'))errors.push('Unlicensed Jio offer terms incorrectly shown as confirmed');
  const entries=await page.locator('#evidence-rows tr').count();
  if(entries<8)errors.push('Evidence ledger displayed too few IPO records: '+entries);
  const dates=await page.locator('#evidence-date').innerText();
  if(!dates.includes('15 Oct 2026'))errors.push('Missing manual review date in evidence ledger');
}
if(label==='issuer-profile'){
  const title=await page.locator('#issuer-detail h1').innerText();
  if(!title.includes('HD Fire Protect'))errors.push('IPO issuer detail failed to render: '+title);
  const sources=await page.locator('#issuer-detail .v41-issuer-evidence a').count();
  if(sources<2)errors.push('Issuer profile missing source/evidence drill-down links');
}
if(label==='ipo-calendar'){
  await page.locator('.v42-filing-card').first().waitFor({state:'visible',timeout:8500});
  const filings=await page.locator('.v42-filing-card').count();
  if(filings!==2)errors.push('SEBI source watch expected 2 simulated filings, got '+filings);
  const matches=await page.locator('.v42-crosscheck').count();
  if(matches<2)errors.push('SEBI RHP matching badges not rendered (expected 2), got '+matches);
  await page.locator('[data-stage-filter="upcoming"]').click();
  const cards=await page.locator('#ipo-issues .ipo-card').count();
  const filtered=await page.locator('#ipo-issues .ipo-card[data-stage="upcoming"]').count();
  if(cards!==filtered)errors.push('IPO stage filter mismatch');
  await page.locator('[data-stage-filter="all"]').click();
  const sources=await page.locator('#ipo-issues .ipo-card-actions .ipo-original-source').count();
  if(sources<1)errors.push('IPO issue source links not rendered');
}
}catch(e){errors.push(label+' '+viewport.name+': '+e.message);}
}
await page.close();
}
await browser.close();
if(errors.length){console.error('Visual QA failures:\n'+errors.join('\n'));process.exitCode=1;}else console.log('V4 screenshot smoke QA passed');
})().catch(e=>{console.error(e);process.exitCode=1});
