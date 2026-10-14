/* Angel Research V3.2 private dashboard.
 * The owner key is held ONLY in JS memory, never localStorage/cookies/URL.
 * Owner-entered non-credential marketing figures are saved in this browser
 * and are not automatically synced across devices.
 */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id);
const fmt=n=>new Intl.NumberFormat('zh-CN',{maximumFractionDigits:0}).format(Math.max(0,Math.round(Number(n)||0)));
const money=n=>Number.isFinite(n)?new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n):'—';
const pct=(num,den)=>den>0?(100*num/den).toFixed(1)+'%':'—';
const keyFor=(item)=>String(item.source||'direct')+'|'+String(item.campaign||'direct');
const LOCAL_KEY='angel_research_campaign_manual_v32';
let accessKey='',report=null,days=7,filter='',loading=false,notes={},excludeTest=true;
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
 $('source-status').className='source-status';$('source-status').lastChild.textContent=' 尚未解锁管理权限';
 setNotice('后台已锁定。请输入 Cloudflare 管理密钥才能读取统计数据。');
}
function loadNotes(){
 try{
  const value=JSON.parse(w.localStorage.getItem(LOCAL_KEY)||'{}');
  if(value&&typeof value==='object'&&!Array.isArray(value))notes=value;
 }catch(_e){notes={}}
}
function saveNotes(){
 try{w.localStorage.setItem(LOCAL_KEY,JSON.stringify(notes))}catch(_e){
   setNotice('当前浏览器无法保存手工录入的推广费用或进群人数，Cloudflare 原始统计不受影响。','error');
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
   if(!Number.isFinite(x)||x<0){setNotice('请输入非负数，或清空输入框。','error');return false}
   rec[field]=Math.floor(x);
 }
 notes[k]=rec;
 saveNotes();
 renderTotals();renderTable();renderCostRank();
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
 input.setAttribute('aria-label',({spend:'推广费用',impressions:'帖子曝光量',joins:'真实进群人数'}[field]||field)+'：'+item.campaign);
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
   cell.colSpan=14;cell.className='empty-row';cell.textContent='选定时间内暂无符合条件的推广活动数据。';
   row.appendChild(cell);body.appendChild(row);return;
 }
 rows.forEach(c=>{
   const row=d.createElement('tr');
   const name=td(row,c.campaign==='direct'?'直接访问':(c.campaign||'直接访问'));
   const src=d.createElement('span');src.className='source';src.textContent='来源：'+({direct:'直接访问',x:'X 平台',youtube:'YouTube',facebook:'Facebook',instagram:'Instagram'}[c.source]||c.source||'直接访问');name.appendChild(src);
   td(row,fmt(c.visitorSessions||0));td(row,fmt(c.clickSessions||0));
   td(row,fmt(c.views));td(row,fmt(c.redirects));td(row,pct(c.redirects,c.views));
   td(row,fmt(c.indiaViews||0));td(row,pct(c.indiaViews||0,c.views));td(row,fmt(c.indiaRedirects||0));
   editCell(row,c,'spend');editCell(row,c,'impressions');editCell(row,c,'joins');
   const joins=noteValue(c,'joins'),spent=noteValue(c,'spend');
   td(row,noteHas(c,'spend')&&c.redirects>0?money(spent/c.redirects):'—');
   td(row,joins>0&&noteHas(c,'spend')?money(spent/joins):'—');
   body.appendChild(row);
 });
}
function renderTotals(){
 if(!report)return;
 const t=report.totals||{};
 $('metric-sessions').textContent=t.visitorSessions>0?fmt(t.visitorSessions):'—';
 $('metric-click-sessions').textContent=t.clickSessions>0?fmt(t.clickSessions):'—';
 $('metric-views').textContent=fmt(t.views);
 $('metric-clicks').textContent=fmt(t.redirects);
 $('metric-rate').textContent=pct(t.redirects,t.views);
 let matchedSpend=0,matchedJoins=0;
 for(const c of report.campaigns){
   if(noteHas(c,'spend')&&noteHas(c,'joins')&&noteValue(c,'joins')>0){
     matchedSpend+=noteValue(c,'spend');matchedJoins+=noteValue(c,'joins');
   }
 }
 $('metric-cpa').textContent=matchedJoins>0?money(matchedSpend/matchedJoins):'—';
}
function renderTrend(){
 const el=$('daily-chart');el.textContent='';
 const rows=report?.daily||[];
 if(!rows.length){const m=d.createElement('p');m.className='chart-empty';m.textContent='该时间段暂无访问或跳转记录。';el.appendChild(m);return}
 const max=Math.max(1,...rows.flatMap(v=>[Number(v.views)||0,Number(v.redirects)||0]));
 for(const item of rows){
  const x=d.createElement('div');x.className='day-bar';
  for(const [field,cls] of [['views','views'],['redirects','clicks']]){
    const col=d.createElement('div');col.className='col '+cls;
    col.style.height=Math.max(0,(Number(item[field])||0)/max*164)+'px';
    col.title=item.day+' · '+(field==='views'?'访问次数':'WS跳转次数')+'：'+fmt(item[field]);
    x.appendChild(col);
  }
  const label=d.createElement('span');label.className='date';
  const parts=String(item.day||'').split('-');
  label.textContent=parts.length===3?parts[1]+'/'+parts[2]:item.day;
  x.appendChild(label);el.appendChild(x);
 }
}
const countryNames={
 IN:'印度',MY:'马来西亚',CA:'加拿大',US:'美国',SG:'新加坡',
 GB:'英国',AU:'澳大利亚',AE:'阿联酋',CN:'中国',HK:'中国香港',
 DE:'德国',JP:'日本',PK:'巴基斯坦',BD:'孟加拉国',LK:'斯里兰卡',
 NP:'尼泊尔',ID:'印度尼西亚',TH:'泰国',PH:'菲律宾',VN:'越南'
};
const countryName=code=>{const key=String(code||'').toUpperCase();return countryNames[key]||(key==='UNK'||key==='UNKNOWN'?'未知':(key||'未知'))};
const indiaRegions={MH:'马哈拉施特拉邦',DL:'德里',KA:'卡纳塔克邦',TN:'泰米尔纳德邦',TG:'特伦甘纳邦',TS:'特伦甘纳邦',GJ:'古吉拉特邦',RJ:'拉贾斯坦邦',UP:'北方邦',WB:'西孟加拉邦',KL:'喀拉拉邦',HR:'哈里亚纳邦',PB:'旁遮普邦',MP:'中央邦',BR:'比哈尔邦',OD:'奥迪沙邦',AP:'安得拉邦',AS:'阿萨姆邦',JK:'查谟和克什米尔',HP:'喜马偕尔邦',UK:'北阿坎德邦',CG:'恰蒂斯加尔邦',GA:'果阿邦'};
const malaysiaRegions={'14':'吉隆坡','10':'雪兰莪','07':'槟城','01':'柔佛','12':'沙巴','13':'砂拉越','05':'霹雳','09':'玻璃市'};
function regionDisplay(x){const c=String(x.country||'').toUpperCase(),r=String(x.region||'').toUpperCase();
 if(r==='UNKNOWN'||r==='UNK'||!r)return countryName(c)+' · 地区未知';
 const lookup=c==='IN'?indiaRegions:c==='MY'?malaysiaRegions:{};
 return countryName(c)+' · '+r+(lookup[r]?'（'+lookup[r]+'）':'');
}
const osNames={ios:'iOS / iPhone',android:'Android',windows:'Windows',macos:'macOS',
 linux:'Linux',other:'其他系统',unknown:'系统未知'};
const deviceNames={mobile:'手机',tablet:'平板',desktop:'电脑',unknown:'未知设备'};
function barList(id,rows,labelText,valueText,maxItems){
 const el=$(id);el.textContent='';
 const data=(rows||[]).slice(0,maxItems||8);
 if(!data.length){const msg=d.createElement('p');msg.className='chart-empty';
   msg.textContent='暂无可用数据（旧记录可能未采集此字段）';el.appendChild(msg);return}
 const max=Math.max(1,...data.map(x=>Number(x.views)||0));
 for(const item of data){
   const div=d.createElement('div');div.className='country-item';
   const label=d.createElement('div');label.className='country-name';
   label.textContent=labelText(item);label.title=label.textContent;
   const track=d.createElement('div');track.className='country-track';
   const bar=d.createElement('span');bar.style.width=Math.min(100,(Number(item.views)||0)/max*100)+'%';track.appendChild(bar);
   const val=d.createElement('div');val.className='country-count';val.textContent=fmt(item.views);
   div.appendChild(label);div.appendChild(track);div.appendChild(val);el.appendChild(div);
 }
}
function renderCountries(){
 barList('country-list',report?.countries,x=>countryName(x.country)+' ('+x.country+')',null,9);
}
function renderDevices(){
 barList('device-list',report?.devices,x=>(deviceNames[x.device]||'其他设备')+' · '+(osNames[x.os]||x.os||'未知系统'),null,10);
 barList('model-list',report?.models,x=>(x.model||'未知').replaceAll('_',' ')+' · '+(osNames[x.os]||x.os),null,7);
}
function renderRegions(){
 barList('region-list',report?.regions,x=>regionDisplay(x),null,11);
}
function renderIndia(){
 const countries=report?.countries||[];
 const india=(report?.campaigns||[]).reduce((a,c)=>({
  views:a.views+(Number(c.indiaViews)||0),
  redirects:a.redirects+(Number(c.indiaRedirects)||0)
 }),{views:0,redirects:0});
 const allViews=Number(report?.totals?.views)||0;
 $('india-views').textContent=fmt(india.views);
 $('india-clicks').textContent=fmt(india.redirects);
 $('india-share').textContent=pct(india.views,allViews);
 const regional=(report?.regions||[]).filter(r=>String(r.country).toUpperCase()==='IN'&&
  !['UNKNOWN','UNK',''].includes(String(r.region||'').toUpperCase()));
 barList('india-region-list',regional,r=>regionDisplay(r),null,10);
 // Ensure the overall country share is never mistaken for individual residents.
 const typed=(report?.devices||[]).reduce((a,v)=>a+(String(v.device||'unknown')!=='unknown'?(Number(v.views)||0):0),0);
 $('device-coverage').textContent=allViews>0?pct(typed,allViews):'—';
}
function renderCostRank(){
 const host=$('cost-rank-list');host.textContent='';
 const candidates=(report?.campaigns||[]).filter(c=>c.redirects>0&&noteHas(c,'spend')&&
   (c.campaign+' '+c.source).toLowerCase().includes(filter))
   .map(c=>({campaign:c.campaign,source:c.source,clicks:c.redirects,views:c.views,
     spend:noteValue(c,'spend'),cost:noteValue(c,'spend')/c.redirects,
     joins:noteHas(c,'joins')?noteValue(c,'joins'):null}))
   .sort((a,b)=>a.cost-b.cost).slice(0,7);
 if(!candidates.length){
   const msg=d.createElement('p');msg.className='chart-empty';
   msg.textContent='暂无可比较的付费活动。请先在博主表格填写推广费用，并确保该活动已有WS跳转记录。';
   host.appendChild(msg);return;
 }
 candidates.forEach((x,i)=>{
  const line=d.createElement('div');line.className='rank-row';
  const num=d.createElement('span');num.className='rank-no';num.textContent=String(i+1).padStart(2,'0');
  const info=d.createElement('div');info.className='rank-info';
  const name=d.createElement('strong');name.textContent=x.campaign;
  const sub=d.createElement('small');sub.textContent='来源 '+x.source+' · 跳转 '+fmt(x.clicks)+' 次 · 总费用 '+money(x.spend)+
    (x.joins!==null?' · 已核实进群 '+fmt(x.joins)+' 人':' · 实际进群未登记');
  info.appendChild(name);info.appendChild(sub);
  const result=d.createElement('div');result.className='rank-cost';
  const amount=d.createElement('b');amount.textContent=money(x.cost);
  const detail=d.createElement('small');detail.textContent='每次WS跳转';
  result.appendChild(amount);result.appendChild(detail);
  line.appendChild(num);line.appendChild(info);line.appendChild(result);host.appendChild(line);
 });
}
function render(){
 renderTotals();renderTable();renderTrend();renderCountries();renderDevices();renderRegions();renderIndia();renderCostRank();
 $('updated-at').textContent='最后更新：'+new Date(report.asOf||Date.now()).toLocaleTimeString('zh-CN',{hour12:false});
 $('source-status').className='source-status ready';
 $('source-status').lastChild.textContent=' 已连接真实统计数据';
 $('auth-panel').hidden=true;$('reporting').hidden=false;
}
async function fetchReport(){
 if(loading||!accessKey)return;
 if(!worker){setNotice('统计服务地址尚未配置，请检查网站连接设置。','error');return}
 loading=true;$('connect-btn').disabled=true;$('refresh').disabled=true;
 setNotice('正在读取 Cloudflare 真实统计数据，请稍候…');
 try{
   const response=await w.fetch(worker+'/report?days='+days+'&exclude_test='+(excludeTest?'1':'0'),{
     method:'GET',mode:'cors',credentials:'omit',cache:'no-store',
     headers:{'Authorization':'Bearer '+accessKey,'Accept':'application/json'}
   });
   let data;
   try{data=await response.json()}catch(_e){throw new Error('统计服务响应格式错误')}
   if(response.status===401){locked();setNotice('管理密钥不正确，请确认与 Cloudflare REPORT_ACCESS_KEY Secret 相同。','error');return}
   if(response.status===503){setNotice('Cloudflare 报表服务尚未配置，请检查 REPORT_ACCESS_KEY 与 ANALYTICS_SQL 绑定。','error');return}
   if(!response.ok||data.ok!==true||!Array.isArray(data.campaigns)){
     throw new Error(data.message||'无法获取 Cloudflare 统计数据');
   }
   report=data;render();
   const scope=data.ipDedup?.enabled?'已启用公网 IP / 24 小时统计去重（仅新事件，旧数据不会回算）':'目前按事件次数统计，IP 去重尚未启用';
   setNotice('已连接真实数据；'+(excludeTest?'已排除测试活动。':'当前包含测试活动。')+' '+scope+'。IP 不等于独立人数，点击不等于实际进群。','ok');
 }catch(error){setNotice('读取私有报表失败：'+String(error?.message||'网络错误').slice(0,200),'error')}
 finally{loading=false;$('connect-btn').disabled=false;$('refresh').disabled=false}
}
function csvField(value){
 let s=String(value??'');
 if(/^[=+\-@\t\r]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
function exportCsv(){
 if(!report)return;
 const header=['推广活动','流量来源','访问会话估算','WS点击会话估算','网页访问次数','WS跳转次数','次数比率','印度访问次数','印度访问占比','印度WS跳转次数','推广费用INR(手工)','帖子曝光量(手工)','实际进群人数(手工)','每次WS跳转成本INR','每位真实进群成本INR'];
 const rows=report.campaigns.filter(c=>(c.campaign+' '+c.source).toLowerCase().includes(filter)).map(c=>{
  const joins=noteValue(c,'joins'),spent=noteValue(c,'spend');
  return[c.campaign,c.source,c.visitorSessions||0,c.clickSessions||0,c.views,c.redirects,
   pct(c.redirects,c.views),c.indiaViews||0,pct(c.indiaViews||0,c.views),c.indiaRedirects||0,
   noteHas(c,'spend')?spent:'',
   noteHas(c,'impressions')?noteValue(c,'impressions'):'',
   noteHas(c,'joins')?joins:'',
   c.redirects>0&&noteHas(c,'spend')?(spent/c.redirects).toFixed(2):'',
   joins>0&&noteHas(c,'spend')?(spent/joins).toFixed(2):''];
 });
 const csv='\uFEFF'+[header,...rows].map(row=>row.map(csvField).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=d.createElement('a');a.href=url;a.download='AngelResearch_推广数据_'+days+'天'+(excludeTest?'_排除测试':'_含测试')+'.csv';
 d.body.appendChild(a);a.click();a.remove();w.setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function init(){
 loadNotes();
 if(!worker)setNotice('Cloudflare 统计服务地址不可用，请检查网站配置。','error');
 $('generate-key').addEventListener('click',async()=>{
   const bytes=new Uint8Array(32);
   w.crypto.getRandomValues(bytes);
   const generated=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
   $('access-key').value=generated;
   try{
     await w.navigator.clipboard.writeText(generated);
     setNotice('安全密钥已在浏览器生成并复制。首次配置时将它保存为 Cloudflare 的 REPORT_ACCESS_KEY Secret。不要在聊天、截图或公开文件中分享。','ok');
   }catch(_e){
     setNotice('已生成安全密钥，但浏览器阻止了自动复制。请私下从输入框复制，勿截图公开。','error');
   }
 });
 $('access-form').addEventListener('submit',event=>{
  event.preventDefault();
  const v=$('access-key').value;
  if(v.length<32){setNotice('请输入长度至少32位的管理员访问密钥。','error');return}
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
 $('exclude-tests').addEventListener('change',event=>{
   if(loading){event.target.checked=excludeTest;return}
   excludeTest=event.target.checked;
   if(accessKey)fetchReport();
 });
 $('refresh').addEventListener('click',fetchReport);
 $('lock').addEventListener('click',locked);
 $('export').addEventListener('click',exportCsv);
 $('search').addEventListener('input',event=>{filter=event.target.value.trim().toLowerCase();renderTable();renderCostRank()});
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
