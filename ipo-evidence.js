/* V4.1 evidence and freshness logic. This module NEVER retrieves or invents market values. */
(function(root){
  'use strict';
  var tiers={
    sebi:{type:'official-directory',name:'SEBI (official index)'},
    exchange:{type:'official-directory',name:'NSE (official index)'},
    bse:{type:'official-directory',name:'BSE (official index)'},
    groww:{type:'aggregator',name:'Groww IPO calendar'},
    calendar:{type:'aggregator',name:'Groww IPO calendar'},
    reuters:{type:'media',name:'Reuters reporting'},
    jioReuters:{type:'media',name:'Reuters reporting'},
    financialExpress:{type:'media',name:'Financial Express reporting'},
    expressHealth:{type:'media',name:'Express Healthcare reporting'},
    sebiConsultation:{type:'media',name:'Reuters reporting'}
  };
  function ageHours(snapshot,now){
    var t=Date.parse(snapshot),current=now===undefined?Date.now():now;
    return Number.isFinite(t)?Math.max(0,(current-t)/3600000):Infinity;
  }
  function freshness(snapshot,now){
    var age=ageHours(snapshot,now);
    if(!Number.isFinite(age))return {code:'invalid',text:'Review timestamp unavailable',ageHours:null};
    if(age>48)return {code:'stale',text:'Editorial review overdue',ageHours:age};
    if(age>24)return {code:'aging',text:'Editorial review may be out of date',ageHours:age};
    return {code:'dated',text:'Dated editorial snapshot',ageHours:age};
  }
  function classify(issue,model){
    var entry=tiers[issue.source]||{type:'unknown',name:'Unclassified editorial reference'};
    var url=model && model.sources && model.sources[issue.source] || '';
    var valid=typeof url==='string' && /^https:\/\//.test(url);
    return {tier:entry.type,publisher:entry.name,url:valid?url:null,
      label:entry.type==='official-directory'?'OFFICIAL DIRECTORY':entry.type==='media'?'MEDIA REPORT':entry.type==='aggregator'?'CALENDAR AGGREGATOR':'SOURCE NOT CLASSIFIED',
      primaryVerified:false};
  }
  function inspect(model,now){
    var bad=[],warn=[],names=new Set();
    if(!model||!Array.isArray(model.issues)||!model.issues.length){bad.push('IPO list is empty');return {bad:bad,warnings:warn,items:[],freshness:freshness(null,now)}}
    var f=freshness(model.checkedAt,now);
    if(f.code==='stale'||f.code==='invalid')warn.push('Editorial timestamp needs review ('+f.text+')');
    model.issues.forEach(function(v){
      var name=v.name||v.id||'unnamed';
      if(!v.id||names.has(v.id))bad.push('Duplicate or absent issue ID: '+name);
      names.add(v.id);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(v.open)||!/^\d{4}-\d{2}-\d{2}$/.test(v.close)||v.open>v.close)bad.push('Invalid dates: '+name);
      if(!Number.isFinite(v.low)||!Number.isFinite(v.high)||v.low<=0||v.low>v.high)bad.push('Invalid reported price range: '+name);
      if(v.lot!==null&&(!Number.isInteger(v.lot)||v.lot<=0))bad.push('Invalid lot: '+name);
      var src=classify(v,model);
      if(!src.url)bad.push('Missing HTTPS source link: '+name);
      if(src.tier==='aggregator')warn.push(name+': independent official issue document not linked');
    });
    return {bad:bad,warnings:warn,items:model.issues.length,freshness:f};
  }
  root.AngelIPOEvidence={tiers:tiers,ageHours:ageHours,freshness:freshness,classify:classify,inspect:inspect};
})(typeof window!=='undefined'?window:globalThis);
