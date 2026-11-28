/* V3.4 runtime diagnostics. This checks the real Worker and does not fabricate data. */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id);
const base=String(w.AngelConversionConfig?.workerBase||'').replace(/\/+$/,'');
const controls=['ops-worker-status','ops-db-status','ops-route-status','ops-ip-dedup-status','ops-india-geo-status','ops-registration-status','ops-primary-status','ops-latency-status'];
const fmt=(id,s)=>{const el=$(id);if(el)el.textContent=s};
let busy=false;
async function refresh(){
 if(busy)return;busy=true;
 const btn=$('ops-refresh');if(btn)btn.disabled=true;
 for(const id of controls)fmt(id,'检查中…');
 try{
  const controller=new AbortController(),deadline=w.setTimeout(()=>controller.abort(),6500);
  let response;
  try{response=await w.fetch(base+'/health',{mode:'cors',cache:'no-store',credentials:'omit',signal:controller.signal})}
  finally{w.clearTimeout(deadline)}
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  if(data.status!=='ok')throw Error('unexpected_response');
  fmt('ops-worker-status','连接正常');
  fmt('ops-db-status',data.databaseCheck==='ok'?'查询正常':data.databaseCheck==='error'?'查询失败':data.linkDatabaseConnected===true?'已绑定 · 未验证查询':data.linkDatabaseConnected===false?'未绑定':'状态未知');
  fmt('ops-route-status',data.routeMode==='protected'?'受保护模式':data.routeMode==='dynamic_primary'?'动态主群模式':data.routeMode==='legacy'?'旧跳转模式':'状态未知');
  fmt('ops-ip-dedup-status',data.ipDedupEnabled===true?(data.ipDedupReady?'已开启 · '+data.ipDedupWindowHours+'小时':'已开启但缺少密钥/绑定'):data.ipDedupEnabled===false?'未启用':'状态未知');
  fmt('ops-india-geo-status',data.inviteIndiaOnly===true?'仅印度 IP':'未启用');
  fmt('ops-registration-status',data.registrationCheck==='ok'?'结构正常':data.registrationCheck?'需要检查':'旧版接口 · 未验证');
  fmt('ops-primary-status',data.primaryCheck==='configured'?'已配置（未验证群有效性）':data.primaryCheck||'未验证');
  fmt('ops-latency-status',Number.isFinite(data.checkDurationMs)?data.checkDurationMs+' ms · '+new Date().toLocaleTimeString():'未验证');
  const el=$('ops-livebar');
  if(el)el.dataset.health=data.databaseCheck==='ok'&&data.registrationCheck==='ok'&&data.primaryCheck==='configured'?'ok':'warning';
 }catch(_e){
  for(const id of controls)fmt(id,'暂不可查');
  fmt('ops-worker-status','无法连接');
  fmt('ops-db-status','暂不可查');
  fmt('ops-route-status','暂不可查');
  fmt('ops-ip-dedup-status','暂不可查');
  fmt('ops-india-geo-status','暂不可查');
  const el=$('ops-livebar');if(el)el.dataset.health='error';
 }finally{busy=false;if(btn)btn.disabled=false}
}
const start=()=>{if($('ops-refresh'))$('ops-refresh').addEventListener('click',refresh);refresh();w.setInterval(()=>{if(!d.hidden)refresh()},60000);d.addEventListener('visibilitychange',()=>{if(!d.hidden)refresh()})};
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window,document);
