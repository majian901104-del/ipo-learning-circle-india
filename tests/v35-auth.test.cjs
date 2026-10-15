'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const R=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(R,p),'utf8');
test('V3.5 single login in analytics dashboard, secondary form hidden and no extra password generated',()=>{
 const html=read('analytics-dashboard.html'),js=read('analytics-dashboard.js'),links=read('link-management.js');
 assert.match(html,/统一管理员登录 · V3\.5/);
 assert.match(html,/现有 LINK_ADMIN_KEY/);
 assert.ok(html.includes('id="link-signin" class="card" aria-label="旧版应急登录" hidden'));
 assert.ok(html.includes('id="generate-key" hidden'));
 assert.ok(js.includes("worker+'/admin/session'"));
 assert.ok(js.includes("new w.CustomEvent('angel-admin-session'"));
 assert.ok(links.includes("w.addEventListener('angel-admin-session'"));
 assert.ok(links.includes("w.addEventListener('angel-admin-session-end'"));
 assert.ok(links.includes("new w.CustomEvent('angel-admin-request-lock'"));
 assert.ok(!js.includes('accessKey=v;'));
});
test('V3.5 login state is kept only in tab memory; no local/session storage for auth session',()=>{
 const j=read('analytics-dashboard.js');
 const links=read('link-management.js');
 assert.ok(!/localStorage\.setItem\(['"]admin_session/.test(j+links));
 assert.ok(!/sessionStorage\.setItem\(['"]admin_session/.test(j+links));
 assert.ok(links.includes("key=token;"));
 assert.ok(j.includes("accessKey=data.token;"));
 assert.ok(j.includes("w.addEventListener('angel-admin-request-lock',locked)"));
});
test('public routing and statistics IP dedup remain unchanged by admin login upgrade',()=>{
 const cfg=read('conversion-worker/wrangler.toml'),worker=read('conversion-worker/src/index.mjs');
 assert.match(cfg,/LINK_MODE_ENABLED = "false"/);
 assert.match(cfg,/ANALYTICS_IP_DEDUP_ENABLED = "true"/);
 assert.match(cfg,/JOIN_INDIA_ONLY_ENABLED = "true"/);
 assert.ok(worker.includes("url.pathname==='/join'"));
 assert.ok(worker.includes("url.pathname==='/report'"));
});
