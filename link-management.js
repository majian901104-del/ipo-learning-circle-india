(function(w,d){
'use strict';
const $=id=>d.getElementById(id);
const base=String(w.AngelConversionConfig?.workerBase||'').replace(/\/+$/,'');
let key='',state=null;
function say(text){$('link-message').textContent=text}
function mask(text){
 if(!text)return '未配置';
 try{const u=new URL(text);const x=u.pathname;return u.origin+(x.length>10?x.slice(0,3)+'••••'+x.slice(-4):'/**••**')}catch(_e){return '已配置（隐藏）'}
}
async function call(path,method='GET',payload){
 const response=await fetch(base+path,{method,mode:'cors',credentials:'omit',cache:'no-store',
  headers:{Authorization:'Bearer '+key,Accept:'application/json',...(payload?{'Content-Type':'application/json'}:{})},
  ...(payload?{body:JSON.stringify(payload)}:{})});
 const data=await response.json().catch(()=>({error:'invalid_response'}));
 if(!response.ok)throw Error((data.error||'HTTP '+response.status)+(response.status===503?' · Cloudflare 可能尚未配置 D1/管理密钥':''));
 return data;
}
function render(data){
 state=data.state;$('link-app').hidden=false;$('link-signin').hidden=true;
 $('link-primary-url').textContent=mask(state?.active_url);
 $('link-standby-url').textContent=mask(state?.standby_url);
 $('link-initialize').hidden=!!state?.active_url;
 $('link-switch').disabled=!state?.standby_url;
 $('link-history').replaceChildren();
 for(const h of data.history||[]){
  const tr=d.createElement('tr');
  for(const value of [h.at,h.action,mask(h.old_url),mask(h.new_url)]){
   const td=d.createElement('td');td.textContent=value||'—';tr.append(td);
  }
  const td=d.createElement('td');
  if(h.old_url){
   const button=d.createElement('button');button.type='button';button.className='secondary';
   button.textContent='恢复';button.addEventListener('click',async()=>{
    if(!w.confirm('历史目标将先恢复为备用群。确认之后还需要你手动执行切换。'))return;
    try{await call('/admin/links/restore','POST',{auditId:h.id,version:state.version});await refresh()}
    catch(e){say('恢复失败：'+e.message)}
   });td.append(button);
  }tr.append(td);$('link-history').append(tr);
 }
 say('已连接。版本号 '+state.version+'；修改后须由管理员确认切换，旧主群不会自动变成备用群。');
}
async function refresh(){render(await call('/admin/links'))}
async function submit(path,input,method){
 const value=$(input).value.trim();
 if(!value||!/^https:\/\//i.test(value)){say('请输入正确的 HTTPS 链接');return}
 if(!w.confirm('确认提交这个群地址？服务端会验证网址和短链最终目标。'))return;
 try{
  await call(path,method,{url:value,version:state.version});
  $(input).value='';await refresh();
 }catch(e){say('保存失败：'+e.message)}
}
$('link-unlock').addEventListener('click',async()=>{
 key=$('link-key').value;$('link-key').value='';
 try{await refresh()}catch(e){key='';say('解锁失败：'+e.message)}
});
$('link-save-primary').addEventListener('click',()=>submit('/admin/links/primary','primary-input','PUT'));
$('link-save-standby').addEventListener('click',()=>submit('/admin/links/standby','standby-input','PUT'));
$('link-switch').addEventListener('click',async()=>{
 if(!state?.standby_url)return;
 if(!w.confirm('重要：确认将备用群设为当前主群？原主群将停用，且不会自动成为备用群。'))return;
 try{await call('/admin/links/switch','POST',{version:state.version});await refresh();say('切换成功：从现在起新通过验证的请求将使用新主群。')}
 catch(e){say('切换失败：'+e.message)}
});
$('link-reload').addEventListener('click',()=>refresh().catch(e=>say(e.message)));
$('link-logout').addEventListener('click',()=>{key='';state=null;$('link-app').hidden=true;$('link-signin').hidden=false;say('管理权限已锁定。')});
w.addEventListener('pagehide',()=>{key=''});
})(window,document);