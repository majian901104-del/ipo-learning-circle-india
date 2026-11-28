/* V3.7 private lead viewer. Requires existing V3.5 in-memory owner session. */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id);
let token='',records=[],nextBefore=null,loading=false,apiBase='';
try{
 const u=new URL(w.AngelConversionConfig?.workerBase||'');
 if(u.protocol==='https:'&&u.pathname==='/')apiBase=u.origin
}catch(_e){}
const say=message=>{if($('leads-message'))$('leads-message').textContent=message};
function reset(){
 token='';records=[];nextBefore=null;
 if($('leads-body'))$('leads-body').textContent='';
 for(const id of ['leads-search','leads-age','leads-source','leads-days','leads-device','leads-os','leads-country'])if($(id))$(id).value='';
 if($('leads-export'))$('leads-export').disabled=true;
 if($('leads-more'))$('leads-more').hidden=true;
 if($('leads-page-count'))$('leads-page-count').textContent='请先登录管理员账号';
 say('后台已锁定，个人资料不可查看。');
}
function rowCell(row,text){
 const td=d.createElement('td');td.textContent=String(text??'');td.style.padding='13px 8px';
 td.style.borderBottom='1px solid #e2eaf0';row.appendChild(td);return td
}
function filtered(){
 const q=($('leads-search')?.value||'').trim().toLowerCase(),age=$('leads-age')?.value||'',source=($('leads-source')?.value||'').trim().toLowerCase();
 const device=$('leads-device')?.value||'',os=$('leads-os')?.value||'',country=($('leads-country')?.value||'').trim().toUpperCase();
 const days=Number($('leads-days')?.value||0),cutoff=Date.now()/1000-days*86400;
 return records.filter(x=>(!q||[x.full_name,x.whatsapp_number,x.campaign].some(v=>String(v||'').toLowerCase().includes(q)))&&(!age||(x.age_range||'unknown')===age)&&(!source||String(x.source||'').toLowerCase().includes(source))&&(!device||(x.device_type||'unknown')===device)&&(!os||(x.operating_system||'unknown')===os)&&(!country||(x.country_code||'').toUpperCase()===country)&&(!days||Number(x.created_at)>=cutoff));
}
const deviceLabel=x=>({mobile:'手机',desktop:'电脑',tablet:'平板',unknown:'未知'}[x]||'未知');
const osLabel=x=>({ios:'iOS',android:'Android',windows:'Windows',macos:'macOS',linux:'Linux',chromeos:'ChromeOS',unknown:'未知'}[x]||'未知');
function show(){
 const body=$('leads-body');body.textContent='';
 const shown=filtered();
 for(const lead of shown){
  const tr=d.createElement('tr');
  const time=Number(lead.created_at);
  rowCell(tr,Number.isFinite(time)?new Date(time*1000).toISOString().replace('T',' ').slice(0,16):'—');
  rowCell(tr,lead.full_name);rowCell(tr,lead.age_range||'未记录');rowCell(tr,lead.whatsapp_number);rowCell(tr,lead.source);
  rowCell(tr,lead.campaign);rowCell(tr,lead.medium||'未知');rowCell(tr,deviceLabel(lead.device_type));rowCell(tr,osLabel(lead.operating_system));rowCell(tr,lead.country_code||'未知');rowCell(tr,lead.region_code||'未知');rowCell(tr,lead.metadata_opt_in===1?'已授权':'未记录 / 未授权');rowCell(tr,lead.updates_opt_in?'已单独同意':'未同意');
  const td=rowCell(tr,'');const del=d.createElement('button');del.type='button';del.textContent='删除';
  del.className='action outline';del.style.minHeight='32px';del.style.padding='4px 10px';
  del.addEventListener('click',()=>remove(lead));td.appendChild(del);body.appendChild(tr)
 }
 $('leads-export').disabled=!shown.length;
 $('leads-page-count').textContent='筛选显示 '+shown.length+' / 已加载 '+records.length+' 条 · 非全库统计 · 数据保留上限 90 天 · 并非实际入群人数';
 $('leads-more').hidden=!nextBefore;
}
async function load(more=false){
 if(loading||!token||!apiBase)return;
 const requestToken=token;
 loading=true;$('leads-reload').disabled=true;
 say('正在读取受保护的登记记录…');
 try{
  const uri=apiBase+'/admin/leads'+(more&&nextBefore?'?before='+nextBefore:'');
  const res=await w.fetch(uri,{headers:{Authorization:'Bearer '+token},cache:'no-store',mode:'cors'});
  const data=await res.json();
  if(token!==requestToken)return;
  if(res.status===401){reset();say('会话失效，请重新登录。');return}
  if(!res.ok||!data.ok)throw Error(data.error||'read_failed');
  records=more?records.concat(data.leads):data.leads;
  nextBefore=data.nextBefore||null;show();
  say(data.metadataReady===true?'读取成功。仅已授权管理员可以查看这些资料。':'基础登记读取成功；设备资料数据库尚未升级或服务未更新。');
 }catch(e){say('登记表读取失败（若尚未开启 V3.7 或未建表，这是正常的）：'+e.message)}
 finally{loading=false;$('leads-reload').disabled=false}
}
async function remove(lead){
 if(!token||!w.confirm('确定永久删除 '+lead.full_name+' 的登记资料吗？此操作无法撤销。'))return;
 try{
  const r=await w.fetch(apiBase+'/admin/leads/'+encodeURIComponent(lead.id),{method:'DELETE',
    headers:{Authorization:'Bearer '+token},cache:'no-store',mode:'cors'});
  const data=await r.json();
  if(!r.ok||!data.ok)throw Error(data.error||'delete_failed');
  records=records.filter(item=>item.id!==lead.id);show();say('记录已删除。');
 }catch(e){say('删除失败：'+e.message)}
}
const csvCell=s=>{
 let text=String(s??'');
 if(/^[\s]*[=+\-@]/.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
};
function exportCurrent(){
 if(!filtered().length||!token)return;
 if(!w.confirm('此 CSV 包含姓名和手机号码。请仅保存到授权设备，并妥善删除不再需要的副本。确认导出？'))return;
 const rows=[['时间 (UTC)','姓名','年龄范围','WhatsApp','来源','活动','媒介','设备','系统','国家','地区','设备资料授权','同意研究更新'],
 ...filtered().map(x=>[new Date(x.created_at*1000).toISOString(),x.full_name,x.age_range||'',x.whatsapp_number,x.source,x.campaign,x.medium||'',deviceLabel(x.device_type),osLabel(x.operating_system),x.country_code||'',x.region_code||'',x.metadata_opt_in===1?'Yes':'No / unknown',x.updates_opt_in?'Yes':'No'])];
 const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const ref=w.URL.createObjectURL(blob);const a=d.createElement('a');a.href=ref;a.download='angel-community-leads.csv';a.style.display='none';d.body.appendChild(a);a.click();a.remove();
 w.setTimeout(()=>w.URL.revokeObjectURL(ref),1000);
}
function init(){
 for(const id of ['leads-search','leads-age','leads-source','leads-days','leads-device','leads-os','leads-country'])$(id)?.addEventListener('input',()=>{if(token)show()});
 $('leads-reload')?.addEventListener('click',()=>load(false));
 $('leads-more')?.addEventListener('click',()=>load(true));
 $('leads-export')?.addEventListener('click',exportCurrent);
 w.addEventListener('angel-admin-session',event=>{
   token=event.detail?.token||'';if(token)load(false)
 });
 w.addEventListener('angel-admin-session-end',reset);
 reset();
 w.fetch(apiBase+'/health',{cache:'no-store'}).then(r=>r.json()).then(h=>{
   $('leads-mode').textContent=h.leadFormEnabled?'登记页面已启用':'登记页面尚未启用，旧进群跳转保持原样';
 }).catch(()=>{$('leads-mode').textContent='暂无法检查登记开关'});
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
