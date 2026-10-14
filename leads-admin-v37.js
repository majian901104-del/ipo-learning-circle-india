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
 if($('leads-export'))$('leads-export').disabled=true;
 if($('leads-more'))$('leads-more').hidden=true;
 if($('leads-page-count'))$('leads-page-count').textContent='请先登录管理员账号';
 say('后台已锁定，个人资料不可查看。');
}
function rowCell(row,text){
 const td=d.createElement('td');td.textContent=String(text??'');td.style.padding='13px 8px';
 td.style.borderBottom='1px solid #e2eaf0';row.appendChild(td);return td
}
function show(){
 const body=$('leads-body');body.textContent='';
 for(const lead of records){
  const tr=d.createElement('tr');
  const time=Number(lead.created_at);
  rowCell(tr,Number.isFinite(time)?new Date(time*1000).toISOString().replace('T',' ').slice(0,16):'—');
  rowCell(tr,lead.full_name);rowCell(tr,lead.whatsapp_number);rowCell(tr,lead.source);
  rowCell(tr,lead.campaign);rowCell(tr,lead.updates_opt_in?'已单独同意':'未同意');
  const td=rowCell(tr,'');const del=d.createElement('button');del.type='button';del.textContent='删除';
  del.className='action outline';del.style.minHeight='32px';del.style.padding='4px 10px';
  del.addEventListener('click',()=>remove(lead));td.appendChild(del);body.appendChild(tr)
 }
 $('leads-export').disabled=!records.length;
 $('leads-page-count').textContent='当前显示 '+records.length+' 条 · 数据保留上限 90 天 · 并非实际入群人数';
 $('leads-more').hidden=!nextBefore;
}
async function load(more=false){
 if(loading||!token||!apiBase)return;
 loading=true;$('leads-reload').disabled=true;
 say('正在读取受保护的登记记录…');
 try{
  const uri=apiBase+'/admin/leads'+(more&&nextBefore?'?before='+nextBefore:'');
  const res=await w.fetch(uri,{headers:{Authorization:'Bearer '+token},cache:'no-store',mode:'cors'});
  const data=await res.json();
  if(res.status===401){reset();say('会话失效，请重新登录。');return}
  if(!res.ok||!data.ok)throw Error(data.error||'read_failed');
  records=more?records.concat(data.leads):data.leads;
  nextBefore=data.nextBefore||null;show();
  say('读取成功。仅已授权管理员可以查看这些资料。');
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
 if(!records.length||!token)return;
 if(!w.confirm('此 CSV 包含姓名和手机号码。请仅保存到授权设备，并妥善删除不再需要的副本。确认导出？'))return;
 const rows=[['时间 (UTC)','姓名','WhatsApp','来源','活动','同意研究更新'],
 ...records.map(x=>[new Date(x.created_at*1000).toISOString(),x.full_name,x.whatsapp_number,x.source,x.campaign,x.updates_opt_in?'Yes':'No'])];
 const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const ref=w.URL.createObjectURL(blob);const a=d.createElement('a');a.href=ref;a.download='angel-community-leads.csv';a.style.display='none';d.body.appendChild(a);a.click();a.remove();
 w.setTimeout(()=>w.URL.revokeObjectURL(ref),1000);
}
function init(){
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
