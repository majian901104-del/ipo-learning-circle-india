#!/usr/bin/env node
'use strict';
// V4.1 editorial audit. Never upgrades reported numbers to primary confirmed status.
// Usage: node scripts/v41-ipo-audit.cjs [--strict] [--output=path]
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const args=process.argv.slice(2);
const ctx={window:{}};ctx.globalThis=ctx.window;
for(const file of ['ipo-market-data.js','ipo-evidence.js']){
  vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
}
const m=ctx.window.AngelIPOData, E=ctx.window.AngelIPOEvidence;
if(!m||!E)throw new Error('Editorial dataset or evidence evaluator missing');
const result=E.inspect(m);
const errors=Array.from(result.bad),warnings=Array.from(result.warnings);
for(const v of m.issues){
  if(v.detail && !fs.existsSync(path.join(root,v.detail)))errors.push('Missing detail page '+v.id+': '+v.detail);
}
for(const b of m.briefing||[]){
  if(!b.source||!m.sources[b.source])errors.push('Editorial briefing missing source: '+b.title);
}
if(!m.sources.sebi||!m.sources.exchange||!m.sources.bse)errors.push('Primary exchange/regulator directories missing');
const output={
  schemaVersion:'1.0.0',
  auditType:'structural-and-timestamp-only',
  auditGeneratedAt:new Date().toISOString(),
  snapshotReviewedAt:m.checkedAt,
  editorialDate:m.verifiedDate,
  freshness:result.freshness,
  issueCount:m.issues.length,
  primaryIssuerFilingsIndependentlyAuthenticated:false,
  sourceTierCounts:m.issues.reduce((a,v)=>{const k=E.classify(v,m).tier;a[k]=(a[k]||0)+1;return a},{}),
  errors,warnings,
  limitations:'Structural validation checks consistency, links and timestamps; it does not fetch or authenticate exchange values or confirm IPO prices.'
};
const arg=args.find(x=>x.startsWith('--output='));
if(arg){
  const dest=path.resolve(root,arg.slice('--output='.length));
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,JSON.stringify(output,null,2)+'\n');
}
process.stdout.write(JSON.stringify(output,null,2)+'\n');
if(errors.length||(args.includes('--strict')&&warnings.length))process.exitCode=1;
