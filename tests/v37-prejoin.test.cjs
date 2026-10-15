'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
test('V3.7 production lead form is ON; country/social gating and IP statistical dedup remain separate',()=>{
 const cfg=read('conversion-worker/wrangler.toml');
 assert.match(cfg,/JOIN_LEAD_FORM_ENABLED = "true"/);
 assert.match(cfg,/LINK_DYNAMIC_TARGET_ENABLED = "true"/);
 assert.match(cfg,/LINK_MODE_ENABLED = "false"/);
 assert.match(cfg,/ANALYTICS_IP_DEDUP_ENABLED = "true"/);
});
test('management menu shows protected client details, not publicly exposed data',()=>{
 const html=read('analytics-dashboard.html');
 const nav=read('analytics-dashboard-v323.js');
 const code=read('leads-admin-v37.js');
 assert.ok(html.includes('data-admin-view="leads"'));
 assert.ok(html.includes('id="panel-leads"'));
 assert.ok(html.includes('leads-admin-v37.js'));
 assert.ok(nav.includes('leads:{'));
 assert.ok(code.includes('angel-admin-session'));
 assert.ok(code.includes('angel-admin-session-end'));
 assert.ok(!code.includes('localStorage.setItem'));
});
test('registration policy discloses D1 data processing and separate marketing opt-in',()=>{
 const policy=read('privacy.html');
 const gate=read('conversion-worker/src/lead-gate.mjs');
 assert.ok(policy.includes('Cloudflare D1 database'));
 assert.ok(policy.includes('90 days'));
 assert.ok(gate.includes('updates_opt_in'));
 assert.ok(gate.includes('required'));
 assert.ok(!gate.includes('localStorage'));
});
