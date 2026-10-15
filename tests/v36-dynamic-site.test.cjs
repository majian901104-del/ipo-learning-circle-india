'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('production dynamic routing is independent of inactive country/social and IP dedup rules',()=>{
 const cfg=read('conversion-worker/wrangler.toml');
 assert.match(cfg,/LINK_DYNAMIC_TARGET_ENABLED = "true"/);
 assert.match(cfg,/LINK_MODE_ENABLED = "false"/);
 assert.match(cfg,/ANALYTICS_IP_DEDUP_ENABLED = "true"/);
 const worker=read('conversion-worker/src/index.mjs');
 assert.ok(worker.includes('await dynamicPrimaryUrl(env)'));
 assert.ok(!worker.includes("reserveUniqueIp"));
});
test('management UI allows main group replacement without requiring standby B',()=>{
 const js=read('link-management.js'),html=read('analytics-dashboard.html');
 assert.ok(js.includes("mainButton.textContent=state?.active_url?'验证并更换主群':'初始化主群'"));
 assert.ok(js.includes("mainLabel.textContent=state?.active_url?'更换当前主群邀请链接':'首次初始化主群地址'"));
 assert.ok(js.includes("dynamicPrimaryEnabled"));
 assert.ok(html.includes('单主群模式可直接修改主群 A，无需备用群'));
 assert.ok(html.includes('link-primary-input'));
});
test('marketing HTML build retains Cloudflare /join as one visitor entry point',()=>{
 let n=0;
 for(const entry of fs.readdirSync(root)){
  if(!entry.endsWith('.html')||entry==='analytics-dashboard.html')continue;
  const html=read(entry);
  assert.ok(!/href=(["'])https:\/\/cc\.stockscode\.click\/?\1/i.test(html),entry);
  n++;
 }
 assert.ok(n>30);
 for(const entry of ['index.html','ipo-community.html','ipo-current.html']){
  const html=read(entry);
  assert.ok(html.includes('angel-research-conversion-v31.majian901104.workers.dev/join'),entry);
 }
});
