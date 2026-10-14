'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('V3.7 privacy contact is same independently branded address throughout',()=>{
 const email='support@angelresearchindia.com';
 for(const p of ['privacy.html','contact.html','conversion-worker/src/lead-gate.mjs']){
  assert.ok(read(p).includes(email),p);
  assert.ok(read(p).includes('mailto:'+email),p);
 }
 assert.doesNotMatch(read('privacy.html'),/a public email for non-members is not yet provided|The existing The WhatsApp/);
 assert.ok(read('privacy.html').includes('optional, unticked updates-consent checkbox'));
});
test('prejoin production enablement only after owner confirmed receiving support mailbox and D1 setup',()=>{
 assert.match(read('conversion-worker/wrangler.toml'),/JOIN_LEAD_FORM_ENABLED = "true"/);
 assert.match(read('V3.7-PREJOIN-REGISTRATION.md'),/Owner confirmed receipt of test email/);
});
