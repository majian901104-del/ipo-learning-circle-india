'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const work='https://angel-research-conversion-v31.majian901104.workers.dev/join';
function data(){
 const context={window:{}};vm.runInNewContext(read('ipo-market-data.js'),context);
 return context.window.AngelIPOData;
}
test('published dates and Jio announced issue terms are updated 15 Oct 2026',()=>{
 const d=data();
 assert.equal(d.verifiedDate,'15 Oct 2026 (IST)');
 assert.match(d.notice,/not a live exchange feed/i);
 assert.equal(d.issues.length,10);
 const j=d.issues.find(x=>x.id==='jio-platforms');
 assert.ok(j?.featured);
 assert.equal(j.open,'2026-10-21');assert.equal(j.close,'2026-10-23');
 assert.equal(j.low,1065);assert.equal(j.high,1119);assert.equal(j.lot,12);
 assert.equal(j.detail,'ipo-jio-platforms.html');
 assert.equal(d.issues.find(x=>x.id==='ravita-engineering').open,'2026-10-14');
 assert.equal(new Set(d.issues.map(x=>x.id)).size,d.issues.length);
 for(const x of d.issues){
  assert.ok(x.open<=x.close,x.id);
  assert.ok(x.low>0&&x.high>=x.low,x.id);
  assert.ok(d.sources[x.source],x.id);
  assert.ok(x.notes.length>20,x.id);
 }
});
test('every page previously using fixed group shortlink now points to form',()=>{
 const pages=fs.readdirSync(root).filter(x=>x.endsWith('.html')&&!x.startsWith('analytics-'));
 assert.ok(pages.length>=35);
 let ct=0;
 for(const p of pages){
  const html=read(p);
  assert.ok(!/href=(["'])https:\/\/cc\.stockscode\.click\/?\1/i.test(html),'old join link: '+p);
  assert.doesNotMatch(html,/chat\.whatsapp\.com\/[A-Za-z0-9]{16,}/,p+' contains private invite');
  if(html.includes('data-conversion-join=')){
   assert.ok(html.includes(work),p+' must point to registration');
   assert.ok(html.includes('community-entry-v39.js'),p+' must load campaign metadata enhancer');
   ct++;
  }
 }
 assert.ok(ct>=30,'expected sitewide signup links, found '+ct);
});
test('important pages have editorial as-of-date and correct landing',()=>{
 for(const p of ['index.html','primary-markets.html','ipo-dashboard.html'])
  assert.match(read(p),/IPO market schedule reviewed 15 Oct 2026 IST/);
 assert.match(read('ipo-current.html'),/As of 15 October 2026 IST/);
 assert.match(read('ipo-current.html'),/data-ipo-mode="full"/);
 assert.match(read('ipo-market-ui.js'),/Date\.parse\(m\.checkedAt\)/);
 assert.match(read('ipo-market-ui.js'),/Date\.now\(\)>lastChecked\+2\*24/);
 assert.match(read('ipo-jio-platforms.html'),/₹1,065–₹1,119/);
 assert.match(read('ipo-jio-platforms.html'),/UPDATED 15 OCT 2026/);
});
test('public corporate and signed-copy claims require direct verification',()=>{
 const all=['index.html','about.html','company-background.html','regulatory.html'];
 for(const p of all){
  const html=read(p);
  assert.doesNotMatch(html,/Its defined business collaboration with Nuvama covers/i,p);
 }
 assert.match(read('company-background.html'),/directly with Nuvama|direct confirmation|direct verification|directly with that entity/);
 assert.match(read('regulatory.html'),/requires direct confirmation/);
});
test('mobile IPO coverage remains responsive and free of hidden real-time claims',()=>{
 const css=read('ipo-market.css');
 assert.ok(css.includes('@media(max-width:700px)'));
 assert.ok(css.includes('.ipo-card-featured'));
 assert.ok(css.includes('min-height:44px'));
 assert.match(read('ipo-market-ui.js'),/not a real-time feed/i);
 assert.match(read('ipo-community.html'),/Registration with name and WhatsApp number is required/);
});
test('all included relative JS and CSS assets exist in repository',()=>{
 const pages=['index.html','ipo-current.html','ipo-community.html','ipo-company.html','ipo-dashboard.html','about.html','company-background.html'];
 for(const p of pages){
  const html=read(p);
  const refs=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g)].map(x=>x[1]);
  for(const ref of refs){
   if(/^(https?:)?\/\//.test(ref))continue;
   const local=ref.split('?')[0];
   assert.ok(fs.existsSync(path.join(root,local)),p+': missing '+local);
  }
 }
});
