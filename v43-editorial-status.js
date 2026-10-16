/* V4.3 editorial as-of banner — metadata only, never claims live data.
   Reads the same reviewedAt metadata used by the public IPO calendar. */
(function(window,document){
'use strict';
var m=window.AngelIPOData,bar=document.querySelector('[data-v43-data-note]');
if(!bar)return;
var label=bar.querySelector('[data-v43-review-label]');
if(!label||!m)return;
var checked=Date.parse(m.checkedAt||''),now=Date.now(),age=Number.isFinite(checked)?(now-checked)/36e5:Infinity;
if(!Number.isFinite(checked)){label.textContent='IPO research date unavailable · confirm details with the issuer or exchange';bar.dataset.freshness='stale';return}
var date=new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',year:'numeric',month:'short',day:'numeric'}).format(new Date(checked));
label.textContent='IPO editorial review: '+date+' IST · '+(age>48?'Review overdue — check original exchange and issuer notices':'Dated snapshot, not a live quote');
bar.dataset.freshness=age>48?'stale':'dated';
})(window,document);
