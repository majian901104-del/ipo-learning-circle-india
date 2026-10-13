/* Static contract and simulated navigation tests for V3.2.3.
 * Pure node:test — no external browser/node dependencies.
 */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'analytics-dashboard.html'),'utf8');
const js=fs.readFileSync(path.join(root,'analytics-dashboard.js'),'utf8');
const nav=fs.readFileSync(path.join(root,'analytics-dashboard-v323.js'),'utf8');
const css=fs.readFileSync(path.join(root,'analytics-dashboard-v323.css'),'utf8');
const pages=['overview','traffic','india','devices','promoters','settings'];
test('V3.2.3 retains every operational V3.2.2 analytics control',()=>{
  const used=[...js.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);
  for(const id of new Set(used)){
    assert.ok(html.includes('id="'+id+'"'),'Missing real reporting control: '+id);
  }
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,'Duplicate HTML ID');
  assert.ok(html.indexOf('id="auth-panel"')<html.indexOf('id="reporting"'));
  assert.ok(html.includes('id="reporting" aria-label="私有运营数据统计" hidden'));
  assert.ok(html.includes('name="robots" content="noindex,nofollow,noarchive"'));
  assert.ok(!html.includes('REPORT_ACCESS_KEY='));
});
test('V3.2.3 sidebar modules match six exclusive report panels',()=>{
  for(const page of pages){
    assert.ok(html.includes('data-admin-view="'+page+'"'));
    assert.ok(html.includes('id="panel-'+page+'"'));
    assert.ok(html.includes('data-admin-panel="'+page+'"'));
    assert.ok(nav.includes(page+':{label:'));
  }
  assert.equal([...html.matchAll(/class="admin-view-panel"/g)].length,6);
  assert.ok(html.includes('data-admin-panel="overview"'));
  for(const page of pages.slice(1)){
    assert.match(html,new RegExp('id="panel-'+page+'"[^>]* hidden'));
  }
  assert.ok(html.includes('src="analytics-dashboard.js?v=20261014-v323"'));
  assert.ok(html.includes('src="analytics-dashboard-v323.js?v=20261014-v323"'));
});
test('V3.2.3 mobile shows campaign cards rather than wide scrolling table',()=>{
  assert.match(css,/@media\(max-width:800px\)/);
  assert.ok(css.includes('table-scroll tbody tr{display:grid'));
  assert.ok(css.includes('table-scroll td:nth-child(14)::before'));
  assert.ok(css.includes('admin-shell.is-menu-open .admin-sidebar'));
  assert.ok(css.includes('.admin-v323 .metric-grid{grid-template-columns:repeat(2'));
  assert.ok(css.includes('[hidden]{display:none!important}'));
});
function fakeElement(extra={}){
 const classes=new Set();
 const actions={};
 const e={
   dataset:{},classList:{
    add:(x)=>classes.add(x),
    remove:(x)=>classes.delete(x),
    contains:(x)=>classes.has(x),
    toggle:(x,val)=>{if(val)classes.add(x);else classes.delete(x)}
   },attributes:{},textContent:'',hidden:false,style:{},
   addEventListener:(k,fn)=>{actions[k]=fn},
   setAttribute:(k,v)=>{e.attributes[k]=v},
   focus:()=>{e.focused=true},
   click:()=>{if(actions.click)actions.click({})},
   querySelector:()=>null,...extra
 };
 return e;
}
function mock(){
 const main=fakeElement(),overlay=fakeElement({hidden:true}),menu=fakeElement(),
  sidebar=fakeElement(),lock=fakeElement(),overviewLock=fakeElement();
 const navButtons=pages.map(name=>fakeElement({dataset:{adminView:name}}));
 const panels=pages.map(name=>fakeElement({dataset:{adminPanel:name},hidden:name!=='overview'}));
 const controls=Object.fromEntries([
  ['admin-menu-toggle',menu],['admin-sidebar-overlay',overlay],
  ['admin-sidebar',sidebar],['admin-current-title',fakeElement()],
  ['admin-page-heading',fakeElement()],['admin-page-subtitle',fakeElement()],
  ['overview-lock',overviewLock],['lock',lock]
 ]);
 main.classList.remove('is-menu-open');
 const d={
  readyState:'complete',activeElement:menu,title:'',
  addEventListener:()=>{},
  getElementById:id=>controls[id],
  querySelector:sel=>sel==='.admin-shell'?main:null,
  querySelectorAll:sel=>sel==='.admin-nav-item'?navButtons:
   sel==='.admin-view-panel'?panels:sel==='[data-admin-view]'?navButtons:[]
 };
 sidebar.querySelector=()=>navButtons.find(btn=>btn.classList.contains('is-active'))||navButtons[0];
 const listeners={};
 const w={
  location:{hash:''},history:{replaceState:(_,__,hash)=>{w.location.hash=hash}},
  matchMedia:()=>({matches:true,addEventListener:()=>{}}),
  scrollTo:()=>{},addEventListener:(k,fn)=>{listeners[k]=fn}
 };
 vm.runInNewContext(nav,{window:w,document:d});
 return {main,overlay,menu,sidebar,navButtons,panels,controls,w,listeners};
}
test('V3.2.3 navigation changes one report panel and preserves secure report state',()=>{
 const m=mock();
 assert.equal(m.panels.filter(x=>!x.hidden).length,1);
 assert.equal(m.panels[0].hidden,false);
 m.navButtons[2].click();
 assert.equal(m.panels.filter(x=>!x.hidden).length,1);
 assert.equal(m.panels[2].hidden,false);
 assert.equal(m.controls['admin-page-heading'].textContent,'印度市场专项分析');
 assert.equal(m.w.location.hash,'#india');
 assert.equal(m.navButtons[2].attributes['aria-current'],'page');
 m.navButtons[4].click();
 assert.equal(m.panels[4].hidden,false);
 assert.equal(m.panels[2].hidden,true);
 m.controls['overview-lock'].click();
 assert.equal(m.w.location.hash,'#overview');
 assert.equal(m.panels[0].hidden,false);
});
test('V3.2.3 sidebar can open/close with aria state and page links',()=>{
 const m=mock();
 m.menu.click();
 assert.equal(m.main.classList.contains('is-menu-open'),true);
 assert.equal(m.overlay.hidden,false);
 assert.equal(m.menu.attributes['aria-expanded'],'true');
 m.navButtons[1].click();
 assert.equal(m.main.classList.contains('is-menu-open'),false);
 assert.equal(m.overlay.hidden,true);
 assert.equal(m.menu.attributes['aria-expanded'],'false');
 m.menu.click();
 m.overlay.click();
 assert.equal(m.overlay.hidden,true);
});
