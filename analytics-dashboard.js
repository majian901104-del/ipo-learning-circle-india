/* Angel Research V3.2 private dashboard.
 * The owner key is held ONLY in JS memory, never localStorage/cookies/URL.
 * Owner-entered non-credential marketing figures are saved in this browser
 * and are not automatically synced across devices.
 */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id);
const fmt=n=>new Intl.NumberFormat('en-IN',{maximumFractionDigits:0}).format(Math.max(0,Math.round(Number(n)||0)));
const money=n=>Number.isFinite(n)?new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n):'—';
const pct=(num,den)=>den>0?(100*num/den).toFixed(1)+'%':'—';
const keyFor=(item)=>String(item.source||'direct')+'|'+String(item.campaign||'direct');
const LOCAL_KEY='angel_research_campaign_manual_v32';
let accessKey='',report=null,days=7,filter='',loading=false,notes={};
let worker='';
try{
 const config=w.AngelConversionConfig||{};
 const u=new URL(config.workerBase||'');
 if(config.enabled===true&&u.protocol==='https:'&&u.pathname==='/'&&u.search===''&&u.hash==='')worker=u.origin;
}catch(_e){}
function setNotice(msg,kind=''){
 const node=$('status');node.textContent=msg;node.className='notice'+(kind?' '+kind:'');
}
function locked(){
 report=null;accessKey='';$('access-key').value='';$('auth-panel').hidden=false;$('reporting').hidden=true;
 $('source-status').className='source-status';$('source-status').lastChild.textContent=' Awaiting owner access';
 setNotice('Private reporting is locked. Enter your Cloudflare Worker report key to view aggregated campaigns.');
}
function loadNotes(){
 try{
  const value=JSON.parse(w.localStorage.getItem(LOCAL_KEY)||'{}');
  if(value&&typeof value==='object'&&!Array.isArray(value))notes=value;
 }catch(_e){notes={}}
}
function saveNotes(){
 try{w.localStorage.setItem(LOCAL_KEY,JSON.stringify(notes))}catch(_e){
   setNotice('Your browser could not save the manual campaign figures. The Cloudflare counts are unaffected.','error');
 }
}
function noteValue(item,field){
 const record=notes[keyFor(item)]||{};
 const n=Number(record[field]);
 return Number.isFinite(n)&&n>=0?n:0;
}
function noteHas(item,field){
 return Boolean(notes[keyFor(item)]&&Object.prototype.hasOwnProperty.call(notes[keyFor(item)],field));
}
function saveField(item,field,text){
 const k=keyFor(item),rec=notes[k]||{};
 if(text.trim()==='')delete rec[field];
 else{
   const x=Number(text);
   if(!Number.isFinite(x)||x<0){setNotice('Please enter a positive number, or clear the field.','error');return false}
   rec[field]=Math.floor(x);
 }
 notes[k]=rec;
 saveNotes();
 renderTotals();renderTable();
 return true;
}
function td(row,value,className){
 const cell=d.createElement('td');cell.textContent=String(value);
 if(className)cell.className=className;
 row.appendChild(cell);return cell;
}
function editCell(row,item,field){
 const cell=d.createElement('td');
 const input=d.createElement('input');
 input.type='number';input.min='0';input.step='1';input.inputMode='numeric';
 input.setAttribute('aria-label',field+' for '+item.campaign);
 input.placeholder='—';
 input.value=noteHas(item,field)?String(noteValue(item,field)):'';
 input.addEventListener('change',()=>{saveField(item,field,input.value)});
 cell.appendChild(input);row.appendChild(cell);return cell;
}
function renderTable(){
 const body=$('campaign-body');body.textContent='';
 if(!report)return;
 const rows=report.campaigns.filter(c=>(
  (c.campaign+' '+c.source).toLowerCase().includes(filter)));
 if(!rows.length){
   const row=d.createElement('tr'),cell=d.createElement('td');
   cell.colSpan=8;cell.className='empty-row';cell.textContent='No matching campaign events in the selected time window.';
   row.appendChild(cell);body.appendChild(row);return;
 }
 rows.forEach(c=>{
   const row=d.createElement('tr');
   const name=td(row,c.campaign||'direct');
   const src=d.createElement('span');src.className='source';src.textContent='Source: '+(c.source||'direct');name.appendChild(src);
   td(row,fmt(c.views));td(row,fmt(c.redirects));td(row,pct(c.redirects,c.views));
   editCell(row,c,'spend');editCell(row,c,'impressions');editCell(row,c,'joins');
   const joins=noteValue(c,'joins'),spent=noteValue(c,'spend');
   td(row,joins>0&&noteHas(c,'spend')?money(spent/joins):'—');
   body.appendChild(row);
 });
}
function renderTotals(){
 if(!report)return;
 const t=report.totals||{};
 $('metric-views').textContent=fmt(t.views);
 $('metric-clicks').textContent=fmt(t.redirects);
 $('metric-rate').textContent=pct(t.redirects,t.views);
 let totalSpend=0,totalJoined=0,spendSet=false;
 for(const c of report.campaigns){
   if(noteHas(c,'spend')){totalSpend+=noteValue(c,'spend');spendSet=true}
   if(noteHas(c,'joins'))totalJoined+=noteValue(c,'joins');
 }
 $('metric-cpa').textContent=spendSet&&totalJoined>0?money(totalSpend/totalJoined):'—';
}
function renderTrend(){
 const el=$('daily-chart');el.textContent='';
 const rows=report?.daily||[];
 if(!rows.length){const m=d.createElement('p');m.className='chart-empty';m.textContent='No event history is available in this time range.';el.appendChild(m);return}
 const max=Math.max(1,...rows.flatMap(v=>[Number(v.views)||0,Number(v.redirects)||0]));
 for(const item of rows){
  const x=d.createElement('div');x.className='day-bar';
  for(const [field,cls] of [['views','views'],['redirects','clicks']]){
    const col=d.createElement('div');col.className='col '+cls;
    col.style.height=Math.max(0,(Number(item[field])||0)/max*164)+'px';
    col.title=item.day+' · '+field+': '+fmt(item[field]);
    x.appendChild(col);
  }
  const label=d.createElement('span');label.className='date';
  const parts=String(item.day||'').split('-');
  label.textContent=parts.length===3?parts[1]+'/'+parts[2]:item.day;
  x.appendChild(label);el.appendChild(x);
 }
}
function renderCountries(){
 const el=$('country-list');el.textContent='';
 const rows=(report?.countries||[]).slice(0,6);
 const max=rows.length?Math.max(1,...rows.map(x=>Number(x.views)||0)):1;
 if(!rows.length){el.textContent='No country breakdown has been recorded yet.';return}
 for(const item of rows){
   const div=d.createElement('div');div.className='country-item';
   const label=d.createElement('div');label.className='country-name';label.textContent=String(item.country||'??');
   const track=d.createElement('div');track.className='country-track';
   const bar=d.createElement('span');bar.style.width=Math.min(100,(Number(item.views)||0)/max*100)+'%';
   track.appendChild(bar);
   const val=d.createElement('div');val.className='country-count';val.textContent=fmt(item.views);
   div.appendChild(label);div.appendChild(track);div.appendChild(val);el.appendChild(div);
 }
}
function render(){
 renderTotals();renderTable();renderTrend();renderCountries();
 $('updated-at').textContent='Last fetched: '+new Date(report.asOf||Date.now()).toLocaleTimeString();
 $('source-status').className='source-status ready';
 $('source-status').lastChild.textContent=' Private report connected';
 $('auth-panel').hidden=true;$('reporting').hidden=false;
}
async function fetchReport(){
 if(loading||!accessKey)return;
 if(!worker){setNotice('Worker URL is not configured. Contact the site administrator.','error');return}
 loading=true;$('connect-btn').disabled=true;$('refresh').disabled=true;
 setNotice('Reading source-labelled Cloudflare aggregates…');
 try{
   const response=await w.fetch(worker+'/report?days='+days,{
     method:'GET',mode:'cors',credentials:'omit',cache:'no-store',
     headers:{'Authorization':'Bearer '+accessKey,'Accept':'application/json'}
   });
   let data;
   try{data=await response.json()}catch(_e){throw new Error('Worker returned an unreadable response')}
   if(response.status===401){locked();setNotice('Access key incorrect. Please check the Cloudflare REPORT_ACCESS_KEY secret and try again.','error');return}
   if(response.status===503){setNotice('The Cloudflare report is not configured. Add REPORT_ACCESS_KEY as a Worker secret.','error');return}
   if(!response.ok||data.ok!==true||!Array.isArray(data.campaigns)){
     throw new Error(data.message||'Unable to retrieve Cloudflare Analytics Engine data');
   }
   report=data;render();
   setNotice('Secure aggregate report connected. Counts are approximate request events, not individual people or confirmed WhatsApp joins.','ok');
 }catch(error){setNotice('Could not load the private report: '+String(error?.message||'Network error').slice(0,200),'error')}
 finally{loading=false;$('connect-btn').disabled=false;$('refresh').disabled=false}
}
function csvField(value){
 let s=String(value??'');
 if(/^[=+\-@\t\r]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
function exportCsv(){
 if(!report)return;
 const header=['Campaign','Source','Page events','Redirect requests','Event ratio','INR spend (manual)','Post impressions (manual)','Real joins (manual)','INR per confirmed join'];
 const rows=report.campaigns.filter(c=>(c.campaign+' '+c.source).toLowerCase().includes(filter)).map(c=>{
  const joins=noteValue(c,'joins'),spent=noteValue(c,'spend');
  return[c.campaign,c.source,c.views,c.redirects,pct(c.redirects,c.views),noteHas(c,'spend')?spent:'',
   noteHas(c,'impressions')?noteValue(c,'impressions'):'',noteHas(c,'joins')?joins:'',
   joins>0&&noteHas(c,'spend')?(spent/joins).toFixed(2):''];
 });
 const csv='\uFEFF'+[header,...rows].map(row=>row.map(csvField).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=d.createElement('a');a.href=url;a.download='angel-research-campaigns-'+days+'d.csv';
 d.body.appendChild(a);a.click();a.remove();w.setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function init(){
 loadNotes();
 if(!worker)setNotice('The Worker URL is unavailable. Check conversion-config.js.','error');
 $('generate-key').addEventListener('click',async()=>{
   const bytes=new Uint8Array(32);
   w.crypto.getRandomValues(bytes);
   const generated=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
   $('access-key').value=generated;
   try{
     await w.navigator.clipboard.writeText(generated);
     setNotice('Secure key generated and copied. Paste it into the Cloudflare Worker secret REPORT_ACCESS_KEY. Do not share it in chat, files or screenshots.','ok');
   }catch(_e){
     setNotice('A secure key was generated in the password field, but clipboard access was blocked. Use the browser copy control to copy it privately.','error');
   }
 });
 $('access-form').addEventListener('submit',event=>{
  event.preventDefault();
  const v=$('access-key').value;
  if(v.length<32){setNotice('Enter your owner access key (32 characters or longer).','error');return}
  accessKey=v;$('access-key').value='';fetchReport();
 });
 d.querySelectorAll('[data-days]').forEach(b=>b.addEventListener('click',()=>{
   const next=Number(b.dataset.days);if(![1,7,30].includes(next))return;
   days=next;
   d.querySelectorAll('[data-days]').forEach(x=>{
     x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b?'true':'false');
   });
   if(accessKey)fetchReport();
 }));
 $('refresh').addEventListener('click',fetchReport);
 $('lock').addEventListener('click',locked);
 $('export').addEventListener('click',exportCsv);
 $('search').addEventListener('input',event=>{filter=event.target.value.trim().toLowerCase();renderTable()});
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
