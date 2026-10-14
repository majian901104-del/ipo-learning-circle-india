/* Angel Research V3.2.3 navigation only.
 * Does not access the Cloudflare access key, analytics events or community links.
 * All data widgets remain owned by analytics-dashboard.js.
 */
(function(w,d){
'use strict';
const sections={
 overview:{label:'总览中心',heading:'全站运营总览',sub:'广告投放监控、访问统计与数据质量分析，一站式管理。'},
 traffic:{label:'访问分析',heading:'网站访问分析',sub:'查看访问请求、WhatsApp 跳转、每日趋势与国家来源。'},
 india:{label:'印度市场',heading:'印度市场专项分析',sub:'聚焦印度访问占比、印度 WS 跳转与主要邦／省分布。'},
 devices:{label:'设备与地区',heading:'设备与地区分析',sub:'观察手机、操作系统、可识别设备型号和近似地理来源。'},
 promoters:{label:'博主管理',heading:'博主推广管理',sub:'按推广活动查看印度流量、访问来源及已登记的合作费用。'},
 links:{label:'群链接管理',heading:'群链接管理中心',sub:'统一管理 WhatsApp 主群、备用群与安全切换，不需要打开另一个管理后台。'},
 settings:{label:'数据说明',heading:'数据口径与管理工具',sub:'检查统计边界、安全说明，以及已有的推广工具。'}
};
const $=id=>d.getElementById(id);
let current='overview',lastOpenFocus=null;
const menu=$('admin-menu-toggle'),overlay=$('admin-sidebar-overlay'),sidebar=$('admin-sidebar');
function isMobile(){return w.matchMedia('(max-width:800px)').matches}
function closeMenu(restoreFocus){
 d.querySelector('.admin-shell').classList.remove('is-menu-open');
 overlay.hidden=true;
 menu.setAttribute('aria-expanded','false');
 menu.setAttribute('aria-label','打开导航菜单');
 if(restoreFocus&&lastOpenFocus&&typeof lastOpenFocus.focus==='function'){
   lastOpenFocus.focus();
 }
 lastOpenFocus=null;
}
function openMenu(){
 lastOpenFocus=d.activeElement;
 overlay.hidden=false;
 d.querySelector('.admin-shell').classList.add('is-menu-open');
 menu.setAttribute('aria-expanded','true');
 menu.setAttribute('aria-label','关闭导航菜单');
 const active=sidebar.querySelector('.admin-nav-item.is-active');
 if(active)active.focus();
}
function setView(name,options){
 if(!Object.prototype.hasOwnProperty.call(sections,name))name='overview';
 current=name;
 const info=sections[name];
 for(const item of d.querySelectorAll('.admin-nav-item')){
  const active=item.dataset.adminView===name;
  item.classList.toggle('is-active',active);
  item.setAttribute('aria-current',active?'page':'false');
 }
 for(const panel of d.querySelectorAll('.admin-view-panel')){
  panel.hidden=panel.dataset.adminPanel!==name;
 }
 $('admin-current-title').textContent=info.label;
 $('admin-page-heading').textContent=info.heading;
 $('admin-page-subtitle').textContent=info.sub;
 d.title='Angel Research · '+info.label+' · V3.4';
 d.body.classList.toggle('view-links',name==='links');
 if(options?.setHash && w.history?.replaceState){
  w.history.replaceState(null,'','#'+name);
 }
 closeMenu(false);
 if(options?.scroll!==false){
  w.scrollTo({top:0,behavior:'auto'});
 }
}
function init(){
 const requested=w.location.hash.slice(1).toLowerCase();
 setView(sections[requested]?requested:'overview',{scroll:false,setHash:false});
 d.querySelectorAll('[data-admin-view]').forEach(button=>{
  button.addEventListener('click',()=>{
   setView(button.dataset.adminView,{setHash:true,scroll:true});
  });
 });
 menu.addEventListener('click',()=>{
  if(d.querySelector('.admin-shell').classList.contains('is-menu-open'))closeMenu(true);
  else openMenu();
 });
 overlay.addEventListener('click',()=>closeMenu(true));
 d.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&d.querySelector('.admin-shell').classList.contains('is-menu-open')){
   event.preventDefault();closeMenu(true);
  }
 });
 if(w.matchMedia){
  const query=w.matchMedia('(min-width:801px)');
  if(query.addEventListener)query.addEventListener('change',e=>{if(e.matches)closeMenu(false)});
 }
 w.addEventListener('hashchange',()=>{
  const view=w.location.hash.slice(1).toLowerCase();
  if(sections[view]&&view!==current)setView(view,{scroll:false,setHash:false});
 });
 $('overview-lock').addEventListener('click',()=>{
  const lock=$('lock');
  if(lock){lock.click();setView('overview',{setHash:true,scroll:true});}
 });
 // Prevent a mobile slide-out drawer from remaining visible on back/forward
 // navigation; this code never changes data or sends analytics.
 w.addEventListener('pagehide',()=>closeMenu(false));
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
