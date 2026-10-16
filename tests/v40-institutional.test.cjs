'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pages = [
  'index.html', 'about.html', 'company-background.html', 'ipo-current.html',
  'wealth-management.html', 'asset-management.html', 'research.html', 'contact.html',
  'regulatory.html', 'primary-markets.html', 'ipo-dashboard.html', 'ipo-compare.html',
  'track-record.html', 'disclosures.html', 'risk-disclosure.html', 'service-process.html',
  'businesses.html', 'ipo-jio-platforms.html', 'research-weekly.html', 'gmp.html'
];
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
test('v4 stylesheet is present, with mobile and reduced-motion support', () => {
  const css = read('v40-institutional.css');
  assert.match(css, /\.v40-hero-grid/);
  assert.match(css, /\.v40-header/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  let count=0;
  for(const c of css){if(c==='{')count++;if(c==='}')count--;assert.ok(count>=0);}
  assert.equal(count,0);
});
for(const p of pages){
  test(p + ': shared navigation, content and registration preserved', () => {
    const html=read(p);
    assert.equal((html.match(/<header\b/g)||[]).length,1);
    assert.equal((html.match(/<\/header>/g)||[]).length,1);
    assert.equal((html.match(/<main\b/g)||[]).length,1);
    assert.equal((html.match(/<h1\b/g)||[]).length,1);
    assert.match(html,/name="viewport"/);
    assert.match(html,/v40-institutional\.css/);
    assert.match(html,/class="header v40-header"/);
    assert.match(html,/v40-site/);
    assert.match(html,/community-entry-v39\.js/);
    assert.match(html,/data-conversion-join="true"/);
    assert.match(html,/angel-research-conversion-v31\.majian901104\.workers\.dev\/join/);
    for(const target of ['index.html','ipo-current.html','research.html','wealth-management.html','company-background.html','contact.html']){
      assert.ok(fs.existsSync(path.join(root,target)),target+' missing');
      assert.ok(html.includes('href="'+target+'"'),p+' nav omitted '+target);
    }
  });
}
test('homepage separates IPO intelligence and collaboration',()=>{
  const html=read('index.html');
  assert.match(html,/Institutional thinking\./);
  assert.match(html,/Explore IPO Intelligence/);
  assert.match(html,/v40-hero-visual/);
  assert.match(html,/v40-collab/);
  assert.match(html,/data-ipo-board data-ipo-mode="compact"/);
  assert.match(html,/ipo-market-data\.js/);
  assert.match(html,/ipo-market-ui\.js/);
});
test('collaboration scope remains factual and separate from brokerage',()=>{
  const html=read('company-background.html');
  assert.match(html,/independently under a signed business collaboration letter/i);
  assert.match(html,/does not authorize accepting investor money/i);
  assert.match(html,/id="collaboration-scope"/);
});
test('IPO calendar remains explicitly source-dated rather than real-time',()=>{
  const html=read('ipo-current.html');
  assert.match(html,/Editorially reviewed 15 October 2026 IST/);
  assert.match(html,/not a live exchange feed/i);
  assert.match(html,/data-ipo-board data-ipo-mode="full"/);
});
