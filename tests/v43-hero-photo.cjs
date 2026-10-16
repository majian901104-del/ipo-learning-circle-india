'use strict';
const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{
fs.mkdirSync('hero-qa',{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-IN',extraHTTPHeaders:{DNT:'1','Sec-GPC':'1'}});
const errors=[];
for(const [name,url,selector] of [
['home','https://angelresearchindia.com/','.v40-hero-visual img'],
['community','https://angelresearchindia.com/ipo-community.html','.hero-media img']
]){
 const page=await context.newPage();
 try{
  let r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000});
  if(!r||r.status()!==200)throw Error('HTTP '+r?.status());
  await page.locator(selector).waitFor({state:'attached',timeout:5000});
  let img=page.locator(selector);
  let v=await img.evaluate(async x=>{await Promise.race([x.decode().catch(()=>{}),new Promise(r=>setTimeout(r,10000))]);return{loaded:x.complete&&x.naturalWidth>0,px:x.naturalWidth,py:x.naturalHeight,cssWidth:x.getBoundingClientRect().width,dpr:devicePixelRatio,requestedW:Number(new URL(x.currentSrc).searchParams.get('w'))||null,src:x.currentSrc}});
  console.log(name,JSON.stringify(v));
  if(!v.loaded)errors.push(name+' actual photo failed to load');
  if(v.loaded&&v.px<v.cssWidth-3)errors.push(name+' image intrinsic CSS size too small: '+v.px+' vs '+v.cssWidth);
  if(v.loaded&&v.requestedW&&v.requestedW<v.cssWidth*v.dpr*0.95)errors.push(name+' image request source size too small: '+v.requestedW+' vs '+Math.ceil(v.cssWidth*v.dpr));
  await page.screenshot({path:'hero-qa/'+name+'-mobile-hero.png',fullPage:false,animations:'disabled',timeout:14000});
 }catch(e){errors.push(name+': '+e.message.slice(0,200))}
 finally{await page.close()}
}
await browser.close();console.log(JSON.stringify({pass:errors.length===0,errors}));
if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
