'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const root=require('node:path').resolve(__dirname,'..');
test('built public site exposes no direct legacy WhatsApp CTA links',()=>{
 let checked=0;
 for(const name of fs.readdirSync(root)){
  if(!name.endsWith('.html')||name==='analytics-dashboard.html')continue;
  const html=fs.readFileSync(require('node:path').join(root,name),'utf8');
  assert.ok(!/href=(["'])https:\/\/cc\.stockscode\.click\/?\1/i.test(html),'legacy href: '+name);
  checked++;
 }
 assert.ok(checked>=35);
});
test('rendered home page and IPO community both route CTAs through Cloudflare',()=>{
 for(const name of ['index.html','ipo-community.html','ipo-current.html']){
  const html=fs.readFileSync(require('node:path').join(root,name),'utf8');
  assert.ok(html.includes('src="link-entry-v34.js"'),name+' gate script');
  assert.ok(html.includes('src="conversion-tracker.js"'),name+' metrics script');
  assert.ok(html.includes('https://angel-research-conversion-v31.majian901104.workers.dev/join'),name+' redirected CTA');
 }
});
