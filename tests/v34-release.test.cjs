'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('analytics-dashboard.html'),js=read('link-management.js'),nav=read('analytics-dashboard-v323.js');
test('V3.4 institutional dashboard has real-state surface and mobile CSS',()=>{
 for(const id of ['ops-livebar','ops-worker-status','ops-db-status','ops-route-status','ops-refresh','link-mode','link-routing-note','link-primary-badge','link-standby-badge']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.ok(html.includes('analytics-v34.css'));
 assert.ok(html.includes('ops-health-v34.js'));
 assert.ok(nav.includes("V3.7"));
 const css=read('analytics-v34.css');
 assert.ok(css.includes('@media(max-width:800px)'));
 assert.ok(css.includes('prefers-reduced-motion'));
 assert.ok(css.includes('outline:2px'));
});
test('V3.4 fixes both integrated link-save selector IDs',()=>{
 for(const id of ['link-primary-input','link-standby-input'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(js.includes("submit('/admin/links/primary','link-primary-input','PUT')"));
 assert.ok(js.includes("submit('/admin/links/standby','link-standby-input','PUT')"));
 assert.ok(!js.includes("submit('/admin/links/standby','standby-input','PUT')"));
});
test('staged rollout remains disabled and frontend never embeds private groups',()=>{
 const cfg=read('conversion-config.js');
 const wrangler=read('conversion-worker/wrangler.toml');
 assert.ok(cfg.includes('v34Protected: false'));
 assert.ok(wrangler.includes('LINK_MODE_ENABLED = "false"'));
 assert.ok(!cfg.includes('https://cc.stockscode.click'));
 assert.ok(!/https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{15,}/.test(html));
});
test('public health diagnostics come from server and never claim aggregate traffic values',()=>{
 const worker=read('conversion-worker/src/index.mjs');
 assert.ok(worker.includes("env.LINK_DYNAMIC_TARGET_ENABLED==='true'?'dynamic_primary':'legacy'"));
 assert.ok(worker.includes('linkDatabaseConnected:!!env.LINK_DB'));
 const status=read('ops-health-v34.js');
 assert.ok(status.includes("base+'/health'"));
 assert.ok(status.includes("data.status!=='ok'"));
 assert.ok(!status.includes('LINK_ADMIN_KEY'));
});
