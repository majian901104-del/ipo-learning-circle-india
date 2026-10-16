/* V4.2.1 — Deterministic IPO field-level reconciliation (browser + Node).
 * Security boundary: SEBI filing-index existence does NOT verify IPO terms.
 * Never turns an editorial quote into a verified exchange quote.
 * No scraping or privileged NSE/BSE API calls in this module.
 */
(function(root){
'use strict';
var fields=['open','close','low','high','lot','subscriptionTimes','listingPrice'];
var numeric=new Set(['low','high','lot','subscriptionTimes','listingPrice']);
var docs=new Set(['rhp','prospectus','drhp']);
function norm(s){return String(s||'').normalize('NFKC').toLowerCase()
 .replace(/[-–—]\s*(?:red herring prospectus|rhp|drhp|draft red herring prospectus|abridged prospectus|prospectus).*$/i,'')
 .replace(/\b(?:limited|ltd|pvt|private)\b/g,'').replace(/[^a-z0-9]/g,'');}
function iso(s){return /^\d{4}-\d{2}-\d{2}$/.test(s||'')&&!isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;}
function isoTime(s){var t=Date.parse(s||'');return Number.isFinite(t)?t:null;}
function uri(s,domain){try{var u=new URL(s);return u.protocol==='https:'&&(u.hostname===domain||u.hostname.endsWith('.'+domain))?u.href:null}catch(e){return null;}}
function verifyLicense(r){
 var a=r&&r.rights;
 return !!(a&&a.approved===true&&a.publicDisplay===true&&a.reconciliation===true&&
 typeof a.permissionReference==='string'&&a.permissionReference.trim().length>=8&&
 typeof a.providerId==='string'&&a.providerId.trim().length>1);
}
function classify(snapshot, now){
 if(!snapshot||!['NSE','BSE'].includes(snapshot.exchange))return {ok:false,reason:'unapproved-source'};
 if(!verifyLicense(snapshot))return {ok:false,reason:'rights-not-documented'};
 if(typeof snapshot.issuer!=='string'||norm(snapshot.issuer).length<4)return {ok:false,reason:'invalid-issuer'};
 if(snapshot.isin!=null&&!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(snapshot.isin))return {ok:false,reason:'invalid-isin'};
 if(!uri(snapshot.sourceUrl,snapshot.exchange==='NSE'?'nseindia.com':'bseindia.com'))return {ok:false,reason:'source-link-not-exchange'};
 var checked=isoTime(snapshot.observedAt);
 if(checked===null)return {ok:false,reason:'missing-observation-time'};
 if(checked>now+10*60*1000)return {ok:false,reason:'future-time'};
 if(now-checked>48*3600*1000)return {ok:false,reason:'stale-observation'};
 if(!snapshot.terms||typeof snapshot.terms!=='object'||Array.isArray(snapshot.terms))return {ok:false,reason:'no-terms'};
 for(var key of Object.keys(snapshot.terms)){
  if(!fields.includes(key))return {ok:false,reason:'unknown-field-'+key};
  var v=snapshot.terms[key];
  if(numeric.has(key)&&!(typeof v==='number'&&Number.isFinite(v)&&v>0))return {ok:false,reason:'invalid-'+key};
  if((key==='open'||key==='close')&&!iso(v))return {ok:false,reason:'invalid-'+key};
  if(key==='lot'&&!Number.isInteger(v))return {ok:false,reason:'invalid-lot'};
 }
 if(snapshot.terms.low!=null&&snapshot.terms.high!=null&&snapshot.terms.low>snapshot.terms.high)return {ok:false,reason:'reversed-price-band'};
 if(snapshot.terms.open&&snapshot.terms.close&&snapshot.terms.open>snapshot.terms.close)return {ok:false,reason:'reversed-offer-window'};
 return {ok:true,reason:'accepted'};
}
function matchIssuer(issue,source){
 if(!issue||!source)return false;
 var sameName=norm(issue.name)===norm(source.issuer);
 var isinMatch=issue.isin&&source.isin&&issue.isin===source.isin;
 // When both ISINs exist they MUST be identical. Never fall back to fuzzy name.
 if(issue.isin&&source.isin)return !!isinMatch;
 return !!sameName;
}
function filingsForIssue(issue,sebi){
 var rows=sebi&&Array.isArray(sebi.records)?sebi.records:[];
 return rows.filter(function(x){return docs.has(x.documentType)&&norm(x.title)===norm(issue.name)&&
 !!uri(x.sebiPageUrl,'sebi.gov.in')}).map(function(x){return {documentType:x.documentType,filingDate:x.filingDate,url:x.sebiPageUrl}});
}
function reconcile(issue,exchangeRows,sebi,now){
 now=now===undefined?Date.now():now;
 var filings=filingsForIssue(issue,sebi);
 var rows=[],rejected=[];
 (exchangeRows||[]).forEach(function(r){
  if(!matchIssuer(issue,r))return;
  var v=classify(r,now);
  if(v.ok)rows.push(r);else rejected.push({exchange:r.exchange||'unknown',reason:v.reason});
 });
 var comparison={};
 fields.forEach(function(field){
  var candidates=rows.filter(function(r){return r.terms[field]!==undefined});
  var uniqProviders=new Set(candidates.map(function(c){return c.rights.providerId}));
  var uniqExchanges=new Set(candidates.map(function(c){return c.exchange}));
  var values=candidates.map(function(c){return c.terms[field]});
  var agree=values.length>1&&values.every(function(v){return v===values[0]});
  var status=values.length===0?'not-verified':
      agree&&uniqExchanges.size>=2&&uniqProviders.size>=2?'verified':
      !agree&&uniqExchanges.size>=2?'conflict':'single-source';
  // Never expose disputed values as the winner.
  comparison[field]={status:status,
   value:status==='verified'?values[0]:null,
   sourceCount:candidates.length,
   exchangeCount:uniqExchanges.size,
   sourceLinks:candidates.map(function(x){return {exchange:x.exchange,url:x.sourceUrl,observedAt:x.observedAt}})};
 });
 return {id:issue.id,name:issue.name,filings:filings,filingIndexed:filings.length>0,
  issuerTermsVerified:fields.some(function(f){return comparison[f].status==='verified'}),
  fields:comparison,eligibleExchangeSnapshots:rows.length,rejected:rejected,
  sourcePolicy:'Two distinct licensed providers from NSE and BSE must agree, within the freshness window, for a field to be marked verified. SEBI filing directory does not verify issue terms.'};
}
function build(issues,exchanges,sebi,now){
 var result=issues.map(function(x){return reconcile(x,exchanges,sebi,now)});
 var conflicts=result.reduce(function(n,r){return n+fields.filter(function(f){return r.fields[f].status==='conflict'}).length},0);
 var verified=result.reduce(function(n,r){return n+fields.filter(function(f){return r.fields[f].status==='verified'}).length},0);
 return {schemaVersion:'4.2.1',kind:'cross-source-evidence',builtAt:new Date(now||Date.now()).toISOString(),
  hasLicensedExchangeData:(exchanges||[]).some(function(r){return classify(r,now||Date.now()).ok}),
  issueCount:result.length,verifiedFields:verified,disputedFields:conflicts,rows:result,
  notes:'No NSE/BSE website scraping. Verified status is conditional on licensed independent exchange snapshots and exact per-field agreement.'};
}
root.AngelIPOCrosscheck={fields:fields,norm:norm,iso:iso,verifyLicense:verifyLicense,classify:classify,matchIssuer:matchIssuer,filingsForIssue:filingsForIssue,reconcile:reconcile,build:build};
})(typeof window!=='undefined'?window:globalThis);
