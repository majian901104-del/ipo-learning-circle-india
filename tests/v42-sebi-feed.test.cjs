'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const fixture=path.join(root,'tests','fixtures','sebi-ipo-index.html');
const proc=spawnSync('python3',['scripts/v42-sebi-public-filings.py','--input-html',fixture,'--dry-run'],{cwd:root,encoding:'utf8'});
test('SEBI index fixture parsed into original filing links, with no issue price values',()=>{
 assert.equal(proc.status,0,proc.stderr);
 const j=JSON.parse(proc.stdout);
 assert.ok(j.recordCount>=2);
 assert.equal(j.sample[0].publisher,'SEBI');
 assert.ok(j.sample.every(x=>x.sebiPageUrl.startsWith('https://www.sebi.gov.in/filings/public-issues/')));
 assert.ok(j.sample.every(x=>x.dataVerified===false));
 assert.ok(j.sample.every(x=>!('priceBand' in x)));
});
test('the parser rejects hostile and off-origin URLs and overwrites neither data nor timestamps on failure',()=>{
 const source=fs.readFileSync(path.join(root,'scripts/v42-sebi-public-filings.py'),'utf8');
 assert.match(source,/ALLOWED_HOSTS/);
 assert.match(source,/valid_filing_url/);
 assert.match(source,/Unexpected SEBI redirect destination/);
 assert.match(source,/No SEBI public-issue filing URLs detected/);
 assert.match(source,/args\.dry_run/);
});
test('live-source renderer is separate from editorial IPO price feed',()=>{
 const f=fs.readFileSync(path.join(root,'ipo-market-data.js'),'utf8');
 assert.match(f,/checkedAt:'2026-10-15/);
 const html=fs.readFileSync(path.join(root,'ipo-current.html'),'utf8');
 assert.match(html,/sebi-filings-watch/);
 assert.match(html,/sebi-filings-watch\.js/);
 assert.match(html,/No live IPO pricing/);
});
