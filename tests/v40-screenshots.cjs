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
 ['home','index.html'],['collaboration','company-background.html'],['ipo-calendar','ipo-current.html'],['about','about.html']
];
let errors=[];
for(const viewport of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}]){
const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1});
for(const [label,route] of routes){
try{
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
}catch(e){errors.push(label+' '+viewport.name+': '+e.message);}
}
await page.close();
}
await browser.close();
if(errors.length){console.error('Visual QA failures:\n'+errors.join('\n'));process.exitCode=1;}else console.log('V4 screenshot smoke QA passed');
})().catch(e=>{console.error(e);process.exitCode=1});
