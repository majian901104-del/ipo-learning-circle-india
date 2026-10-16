#!/usr/bin/env node
'use strict';
// Runs without network; this reconciles only reviewed files already present in the repo.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function read(pathname){return JSON.parse(fs.readFileSync(path.join(root,pathname),'utf8'))}
const ctx={window:{},Date:Date,URL:URL,Set:Set};
for(const f of ['ipo-market-data.js','ipo-exchange-reconcile.js']){
 vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
}
const m=ctx.window.AngelIPOData,E=ctx.window.AngelIPOCrosscheck;
const sebi=read('data/sebi-public-issue-filings.json');
const allowed=read('data/approved-exchange-providers.json');
const exchange=read('data/approved-exchange-snapshots.json');
if(!Array.isArray(exchange.records)||!Array.isArray(allowed.providers))throw Error('Invalid licensed input document');
if(exchange.records.length>5000)throw Error('Unexpectedly many input records');
const report=E.build(m.issues,exchange.records,sebi,Date.now(),allowed);
const problems=[];
for(const row of report.rows){
 if(row.filingIndexed&&row.filings.some(x=>!x.url.startsWith('https://www.sebi.gov.in/')))problems.push('Unexpected SEBI official URL');
 const conflicts=Object.entries(row.fields).filter(([k,v])=>v.status==='conflict').map(([k])=>k);
 if(conflicts.length)problems.push(row.id+': disputes in '+conflicts.join(','));
}
const payload={...report,reviewRequired:problems.length>0,reviewIssues:problems,
 publicationMode:report.verifiedFields>0?'review-before-publication':'filing-index-and-editorial-only',
 licensingState:report.hasLicensedExchangeData?'licensed-source-registry-admitted':'no-approved-exchange-data',
 notes:'Official SEBI filing existence is cross-matched; price/dates/lot/subscription are NOT verified without accepted independent licensed evidence.'};
const arg=process.argv.find(x=>x.startsWith('--output='));
if(arg){const dest=path.resolve(root,arg.substring(9));if(!dest.startsWith(root+path.sep))throw Error('output must stay inside project');
 fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(payload,null,2)+'\n');
}
console.log(JSON.stringify({sebiMatchedIssues:report.rows.filter(x=>x.filingIndexed).length,
 verifiedFields:report.verifiedFields,disputedFields:report.disputedFields,
 acceptedLicenses:report.hasLicensedExchangeData,publicationMode:payload.publicationMode,
 crossSourceStatus:'not connected until authorised provider data supplied'},null,2));
if(problems.length&&process.argv.includes('--strict'))process.exitCode=2;
