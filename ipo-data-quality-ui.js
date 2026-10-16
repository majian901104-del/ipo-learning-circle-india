/* V4.1 public evidence ledger for the dated IPO editorial dataset. */
(function(w,d){
 'use strict';
 var m=w.AngelIPOData,E=w.AngelIPOEvidence,body=d.getElementById('evidence-rows');
 if(!m||!E||!body)return;
 function make(tag,text,cls){var a=d.createElement(tag);if(cls)a.className=cls;if(text!==undefined)a.textContent=text;return a}
 function link(label,href){var a=make('a',label);if(/^https:\/\//.test(href||'')){a.href=href;a.target='_blank';a.rel='noopener noreferrer'}else{a.textContent='Source unavailable';a.setAttribute('aria-disabled','true')}return a}
 var res=E.inspect(m),review=E.freshness(m.checkedAt);
 var state=d.getElementById('evidence-status');
 if(state){state.textContent=review.text;state.dataset.state=review.code}
 var date=d.getElementById('evidence-date');if(date)date.textContent=m.verifiedDate+' · Manual editorial review';
 var stat=d.getElementById('evidence-count');if(stat)stat.textContent=String(m.issues.length);
 var gap=d.getElementById('evidence-issues');
 if(gap){gap.textContent=res.bad.length?'Data structure flags: '+res.bad.join('; '):'No structural errors detected. This does not authenticate prices or the source contents.'}
 m.issues.forEach(function(v){
   var entry=E.classify(v,m),tr=make('tr');
   var name=make('td');name.appendChild(make('strong',v.name));name.appendChild(make('small',v.segment+' · '+v.open+' to '+v.close));
   var source=make('td');source.appendChild(make('span',entry.label,'evidence-tier'));source.appendChild(make('small',entry.publisher));
   var data=make('td');data.appendChild(make('span','₹'+v.low+'–₹'+v.high));data.appendChild(make('small',v.lot?'Reported retail lot: '+v.lot:'Lot not recorded; verify original offer document'));
   var check=make('td');check.appendChild(make('span','Editorially recorded '+m.verifiedDate));check.appendChild(make('small','Primary filing not attached to this record'));
   var ref=make('td');ref.appendChild(link('Open source ↗',entry.url));
   [name,source,data,check,ref].forEach(function(td){tr.appendChild(td)});
   body.appendChild(tr);
 });
 var primary=d.getElementById('evidence-primary');
 if(primary)primary.append(link('SEBI offer documents ↗',m.sources.sebi),link('NSE issue notices ↗',m.sources.exchange),link('BSE public issues ↗',m.sources.bse));
})(window,document);
