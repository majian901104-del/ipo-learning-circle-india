(function(w,d){'use strict';
const m=w.AngelIPOData, box=d.getElementById('ar5-calculator');if(!box)return;
const pick=d.getElementById('ar5-issue'),price=d.getElementById('ar5-price'),lot=d.getElementById('ar5-lot'),lots=d.getElementById('ar5-lots'),total=d.getElementById('ar5-total'),shares=d.getElementById('ar5-shares');
const fmt=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2});
const now=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const part=t=>now.find(x=>x.type===t)?.value;const today=part('year')+'-'+part('month')+'-'+part('day');
const issues=(m?.issues||[]).filter(v=>v.listed!==true&&!['listed','cancelled','withdrawn'].includes(v.status)&&today<=v.close&&today<=v.listingDate||v.listed!==true&&!['listed','cancelled','withdrawn'].includes(v.status)&&today<=v.close&&!v.listingDate);
for(const v of issues){const o=d.createElement('option');o.value=v.id;o.textContent=v.name;pick.appendChild(o)}
function update(){const p=Number(price.value),l=Number(lot.value),n=Number(lots.value);if(!Number.isFinite(p)||p<=0||!Number.isSafeInteger(l)||l<=0||!Number.isSafeInteger(n)||n<=0||!Number.isSafeInteger(l*n)||!Number.isFinite(p*l*n)){total.textContent='Enter valid positive values';shares.textContent='';return}total.textContent=fmt.format(p*l*n);shares.textContent=(l*n).toLocaleString('en-IN')+' shares';}
pick.addEventListener('change',()=>{const v=issues.find(x=>x.id===pick.value);price.value=v?.high||'';lot.value=v?.lot||'';lots.value='1';update()});for(const e of [price,lot,lots])e.addEventListener('input',update);update();
})(window,document);
