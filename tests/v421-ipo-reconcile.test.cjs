'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const ctx={window:{},URL,Date,Set};for(const f of ['ipo-market-data.js','ipo-exchange-reconcile.js'])vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const model=ctx.window.AngelIPOData, C=ctx.window.AngelIPOCrosscheck;
const official=JSON.parse(fs.readFileSync(path.join(root,'data/sebi-public-issue-filings.json'),'utf8'));
const noRight=JSON.parse(fs.readFileSync(path.join(root,'data/approved-exchange-providers.json'),'utf8'));
const input=JSON.parse(fs.readFileSync(path.join(root,'data/approved-exchange-snapshots.json'),'utf8'));
const now=Date.parse('2026-10-16T07:40:00Z');
const issue=model.issues.find(x=>x.id==='jio-platforms');
function snap(exchange,price=1119,provider='licensed-'+exchange.toLowerCase()){
 return {exchange,issuer:'Jio Platforms Limited',sourceUrl:exchange==='NSE'?'https://www.nseindia.com/market-data/issue-information?symbol=JIO':'https://www.bseindia.com/markets/PublicIssues/Issuesummary.aspx',observedAt:'2026-10-16T07:20:00Z',rights:{providerId:provider,permissionReference:'AGREEMENT-REF-'+provider},terms:{low:1065,high:price,lot:12,open:'2026-10-21',close:'2026-10-23'}};
}
function registry(...rows){return {providers:rows.map(r=>({providerId:r.rights.providerId,permissionReference:r.rights.permissionReference,approved:true,publicDisplay:true,reconciliation:true,allowedExchanges:[r.exchange],expiresAt:'2027-12-31T00:00:00Z'}))}}
test('production exchange inputs and permission whitelist both start empty (no invented live feed)',()=>{
 assert.equal(noRight.providers.length,0);
 assert.equal(input.records.length,0);
 const r=C.build(model.issues,input.records,official,now,noRight);
 assert.equal(r.hasLicensedExchangeData,false);
 assert.equal(r.verifiedFields,0);
 assert.ok(r.rows.some(x=>x.filingIndexed));
 assert.equal(r.rows.find(x=>x.id==='jio-platforms').fields.high.status,'not-verified');
});
test('SEBI RHP index documents only filing existence, not numerical price validation',()=>{
 const r=C.reconcile(issue,[],official,now,noRight);
 assert.equal(r.filingIndexed,true);
 assert.ok(r.filings.some(x=>x.documentType==='rhp'));
 assert.equal(r.fields.low.value,null);
 assert.equal(r.fields.high.sourceCount,0);
});
test('two independent licensed NSE/BSE feeds must agree exactly on every field',()=>{
 const a=snap('NSE'),b=snap('BSE');const report=C.reconcile(issue,[a,b],official,now,registry(a,b));
 assert.equal(report.fields.high.status,'verified');
 assert.equal(report.fields.high.value,1119);
 assert.equal(report.fields.low.status,'verified');
 assert.equal(report.issuerTermsVerified,true);
});
test('disagreement blocks publication and reports explicit conflict without promoting either value',()=>{
 const a=snap('NSE'),b=snap('BSE',1120);
 const report=C.reconcile(issue,[a,b],official,now,registry(a,b));
 assert.equal(report.fields.high.status,'conflict');
 assert.equal(report.fields.high.value,null);
 assert.equal(report.fields.low.status,'verified');
});
test('one allowed exchange is only one-source, not independently verified',()=>{
 const a=snap('NSE');const report=C.reconcile(issue,[a],official,now,registry(a));
 assert.equal(report.fields.high.status,'single-source');
 assert.equal(report.fields.high.value,null);
});
test('identical submissions by a single provider do not count as independent sources',()=>{
 const a=snap('NSE','1119','same-provider'),b=snap('BSE',1119,'same-provider');
 a.terms.high=1119;
 const register={providers:[{providerId:'same-provider',permissionReference:'AGREEMENT-REF-same-provider',approved:true,publicDisplay:true,reconciliation:true,allowedExchanges:['NSE','BSE'],expiresAt:'2027-12-31T00:00:00Z'}]};
 const report=C.reconcile(issue,[a,b],official,now,register);
 assert.equal(report.fields.high.status,'single-source');
});
test('unapproved, expired, or stale rows never become eligible',()=>{
 const a=snap('NSE');
 assert.equal(C.classify(a,now,noRight).reason,'rights-not-documented');
 let reg=registry(a);reg.providers[0].expiresAt='2025-01-01T00:00:00Z';
 assert.equal(C.classify(a,now,reg).reason,'rights-not-documented');
 reg=registry(a);a.observedAt='2026-10-12T07:20:00Z';
 assert.equal(C.classify(a,now,reg).reason,'stale-observation');
});
test('fuzzy/partial issuer names cannot cross-wire company issue terms',()=>{
 const a=snap('NSE');a.issuer='Jio';
 assert.equal(C.matchIssuer(issue,a),false);
 a.issuer='Jio Platforms Limited';a.isin='INEXXXXXXXXX1';a.issuer='Zetwerk Manufacturing Businesses Limited';
 assert.equal(C.matchIssuer(issue,a),false);
});
test('invalid dates and reversed values are denied before reconciliation',()=>{
 const a=snap('BSE'),reg=registry(a);
 a.terms.low=1500;
 assert.equal(C.classify(a,now,reg).reason,'reversed-price-band');
 a.terms.low=1065;a.terms.close='2026-10-01';
 assert.equal(C.classify(a,now,reg).reason,'reversed-offer-window');
});
test('public website and ledger contain separate, clearly labelled exchange validation status',()=>{
 const page=fs.readFileSync(path.join(root,'ipo-data-quality.html'),'utf8');
 assert.match(page,/data-exchange-crosscheck/);
 assert.match(page,/No licensed NSE\/BSE feed/);
 assert.match(page,/ipo-exchange-status\.js/);
});
