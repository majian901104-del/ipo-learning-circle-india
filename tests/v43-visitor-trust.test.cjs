'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=(x)=>fs.readFileSync(path.join(root,x),'utf8');
test('Homepage: evidence-first structure and genuine distinct visitor pathways',()=>{
 const html=read('index.html');
 for(const marker of ['v43-service','v43-evidence','v43-journey','v43-editorial-status.js',
 'data-v43-review-label','ipo-data-quality.html','research-framework.html']){
  assert.ok(html.includes(marker), 'Missing '+marker);
 }
 assert.equal((html.match(/<a class="v43-path(?: v43-path-primary)?"/g)||[]).length,3);
 assert.match(html,/apply\.html/);
 assert.match(html,/data-conversion-join="true"/);
 assert.match(html,/No assured allotment or returns/);
 assert.doesNotMatch(html,/IPO calendar reviewed 15 Oct 2026 \(IST\)/);
});
test('Contact form and published privacy-contact details agree',()=>{
 const apply=read('apply.html');
 const contact=read('contact.html');
 const privacy=read('privacy.html');
 for(const s of [apply,contact,privacy])assert.match(s,/support@angelresearchindia\.com/);
 assert.doesNotMatch(apply,/public email contact for data requests is not yet provided/);
 assert.match(apply,/consent.*name="consent"/);
 assert.match(contact,/Two separate ways to stay informed/);
 assert.match(contact,/does not join a WhatsApp group/);
});
test('Collaboration claims remain distinct from brokerage and customer funds',()=>{
 const html=read('company-background.html');
 assert.match(html,/Angel Research is independently operated/);
 assert.match(html,/Brokerage, custody, IPO allotment and investor-funds services are not provided/);
 assert.match(html,/Defined responsibility/);
 assert.match(html,/Nuvama Wealth Management Limited/);
});
test('V4.3 editorial freshness banner reads existing reviewed timestamp without inventing a date',()=>{
 const src=read('v43-editorial-status.js');
 let freshnessLabel={textContent:'pending'},bar={dataset:{},querySelector:(q)=>q.includes('label')?freshnessLabel:null};
 const doc={querySelector:(q)=>q==='[data-v43-data-note]'?bar:null};
 const scriptCtx={window:{AngelIPOData:{checkedAt:'2026-10-15T12:15:00+05:30'}},document:doc,Date,Intl};
 assert.doesNotThrow(()=>vm.runInNewContext(src,scriptCtx));
 assert.match(freshnessLabel.textContent,/Oct 15, 2026|15 Oct 2026/);
 assert.match(freshnessLabel.textContent,/Dated snapshot|Review overdue/);
 assert.notEqual(bar.dataset.freshness,undefined);
});
test('Scoping and source archive links remain intact',()=>{
 const css=read('v43-editorial-trust.css');
 assert.match(css,/\.v43-service/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/prefers-reduced-motion/);
 for(const p of ['index.html','about.html','company-background.html','contact.html','research.html','service-process.html']){
   const s=read(p);
   assert.match(s,/v43-editorial-trust\.css/);
   assert.match(s,/community-entry-v39\.js/);
 }
 const search=read('research.html');
 assert.match(search,/research-query/);
 assert.match(search,/Research library/);
});
