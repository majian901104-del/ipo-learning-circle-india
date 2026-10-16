'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx={window:{}};ctx.globalThis=ctx.window;
vm.runInNewContext(read('ipo-market-data.js'),ctx,{filename:'ipo-market-data.js'});
vm.runInNewContext(read('ipo-evidence.js'),ctx,{filename:'ipo-evidence.js'});
const d=ctx.window.AngelIPOData, e=ctx.window.AngelIPOEvidence;
test('IPO data includes a check time and no synthetic confirmed primary flags',()=>{
 assert.ok(Number.isFinite(Date.parse(d.checkedAt)));
 assert.ok(d.issues.length>=8);
 for(const item of d.issues){const c=e.classify(item,d);assert.equal(c.primaryVerified,false);assert.ok(c.url?.startsWith('https://'));assert.ok(['media','aggregator','official-directory'].includes(c.tier))}
 assert.equal(e.classify(d.issues.find(x=>x.id==='jio-platforms'),d).tier,'media');
 assert.equal(e.classify(d.issues.find(x=>x.id==='vaibhav-vyapaar'),d).tier,'aggregator');
});
test('Timestamp age classification is deterministic',()=>{
 const time='2026-10-15T12:15:00+05:30',t=Date.parse(time);
 assert.equal(e.freshness(time,t+6*3600e3).code,'dated');
 assert.equal(e.freshness(time,t+30*3600e3).code,'aging');
 assert.equal(e.freshness(time,t+49*3600e3).code,'stale');
 assert.equal(e.freshness('invalid',t).code,'invalid');
});
test('Editorial structure validation has no broken records',()=>{
 const r=e.inspect(d,Date.parse(d.checkedAt)+3600e3);
 assert.equal(r.bad.length,0,r.bad.join('; '));
 assert.equal(r.items,d.issues.length);
 assert.ok(r.warnings.some(x=>x.includes('independent official issue document')));
});
test('Issuer details inline script parses and provides data provenance',()=>{
 const html=read('ipo-company.html');
 const blocks=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
 assert.ok(blocks.length>=1);
 for(const b of blocks)assert.doesNotThrow(()=>new vm.Script(b));
 assert.match(html,/ipo-evidence\.js/);
 assert.match(html,/v41-issuer-evidence/);
 assert.match(html,/ipo-data-quality\.html/);
 assert.match(html,/research-framework\.html/);
 assert.match(html,/community-entry-v39\.js/);
});
test('Public source ledger clearly distinguishes reported evidence from official primary facts',()=>{
 const html=read('ipo-data-quality.html');
 const js=read('ipo-data-quality-ui.js');
 assert.match(html,/source category/i);
 assert.match(html,/does not independently verify/i);
 assert.match(html,/id="evidence-rows"/);
 assert.match(js,/E\.classify\(v,m\)/);
 assert.match(js,/Open source/);
});
test('V4.1 linked across IPO, disclosure and research while preserving older conversion flows',()=>{
 for(const p of ['index.html','ipo-current.html','ipo-dashboard.html','primary-markets.html']){
  const html=read(p);
  assert.match(html,/ipo-evidence\.js/);
  assert.match(html,/community-entry-v39\.js/);
 }
 for(const p of ['ipo-current.html','disclosures.html','research.html'])assert.match(read(p),/ipo-data-quality\.html/);
 assert.match(read('ipo-market-ui.js'),/v41-board-status/);
 assert.match(read('ipo-market-ui.js'),/v41-source-tier/);
});

test('Institutional nine-section report template refuses to invent missing data',()=>{
const page=read('research-framework.html');
assert.match(page,/Nine required sections/);
assert.match(page,/FINANCIALS/);
assert.match(page,/CONFLICTS|Conflicts/);
assert.match(page,/not automatically upgraded/);
assert.match(read('research.html'),/research-framework.html/);
});
