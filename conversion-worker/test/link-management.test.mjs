import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/index.mjs';
import {platformFromReferer,official,allowedDestination} from '../src/link-management.mjs';
function request(path,method='GET',headers={},body){
 const req=new Request('https://worker.example'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
 return req;
}
function inIndia(req,country='IN'){Object.defineProperty(req,'cf',{value:{country}});return req}
const key='test-only-link-admin-key-is-at-least-thirty-two-chars-long';
function db(){
 const state={active_url:null,standby_url:null,version:0,changed_at:null},audit=[],grants=new Map;
 let pendingSql='',params=[];
 const api={
  prepare(sql){return {bind(...args){return stmt(sql,args)},...stmt(sql,[])}},
  async batch(stmts){const results=[];for(const stmt of stmts)results.push(await stmt.run());return results}
 };
 function stmt(sql,args){
  return {
   async first(){
    if(sql.includes('SELECT active_url'))return {...state};
    if(sql.includes('UPDATE link_grants')){
     const [now,hash,expiry]=args;const grant=grants.get(hash);
     if(!grant||grant.used_at!==null||grant.expires_at<=expiry)return null;
     grant.used_at=now;return {source:grant.source,campaign:grant.campaign};
    }
    throw Error('unexpected first '+sql);
   },
   async all(){
    if(sql.includes('SELECT id,action'))return {results:audit.slice().reverse().slice(0,20)};
    throw Error('unexpected all '+sql);
   },
   async run(){
    if(sql.startsWith('INSERT INTO link_grants')){
     const [hash,source,campaign,expiry]=args;grants.set(hash,{source,campaign,expires_at:expiry,used_at:null});
     return {meta:{changes:1}};
    }
    if(sql.includes('UPDATE link_state')){
     let changed=0;
     if(sql.includes('active_url=standby_url')){
      const [now,expected,dest]=args;
      if(state.version===expected&&state.standby_url===dest&&dest){
       state.active_url=dest;state.standby_url=null;state.version++;state.changed_at=now;changed=1;
      }
     }else{
      const [url,now,expected]=args;
      if(state.version===expected){
       if(sql.includes('active_url=?')&&!state.active_url){state.active_url=url;changed=1}
       if(sql.includes('standby_url=?')){state.standby_url=url;changed=1}
       if(changed){state.version++;state.changed_at=now}
      }
     }
     return {meta:{changes:changed}};
    }
    if(sql.startsWith('INSERT INTO link_audit')){
     let action,old_url,new_url,at,event_version;
     if(sql.includes('SELECT')){
      [action,old_url,new_url,at,event_version]=args;
      if(state.version!==args[5]||state.active_url!==args[6])return {meta:{changes:0}};
     }else [action,old_url,new_url,at]=args;
     audit.push({id:audit.length+1,action,old_url,new_url,at,event_version});
     return {meta:{changes:1}};
    }
    throw Error('unexpected run '+sql);
   }
  };
 }
 return api;
}
function env(){return {LINK_MODE_ENABLED:'true',LINK_DB:db(),LINK_ADMIN_KEY:key,SHORTLINK_ALLOWLIST:'',ANALYTICS:{writeDataPoint(){}}}}
function admin(path,method='GET',body,keyOverride=key,origin='https://angelresearchindia.com'){
 return request(path,method,{Origin:origin,Authorization:'Bearer '+keyOverride,...(body?{'Content-Type':'application/json'}:{})},body);
}
test('strict allowed referral hosts and WhatsApp format',()=>{
 assert.equal(platformFromReferer('https://t.co/abc'),'x');
 assert.equal(platformFromReferer('https://l.facebook.com/l.php'),'facebook');
 assert.equal(platformFromReferer('https://www.instagram.com/stories/test'),'instagram');
 assert.equal(platformFromReferer('https://m.youtube.com/watch?v=123'),'youtube');
 assert.equal(platformFromReferer('https://fake-x.com/path'),null);
 assert.equal(platformFromReferer('http://x.com/'),null);
 assert.equal(official('https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv'),true);
 assert.equal(official('https://chat.whatsapp.com.evil.example/AbCdEfGhIjKlMnOpQrStUv'),false);
});
test('admin denies wrong key, missing configuration and foreign origin',async()=>{
 const e=env();
 assert.equal((await worker.fetch(admin('/admin/links','GET',null,'wrong-password'),e)).status,401);
 assert.equal((await worker.fetch(admin('/admin/links','GET',null,key,'https://evil.example'),e)).status,403);
 assert.equal((await worker.fetch(admin('/admin/links','GET'),{...e,LINK_DB:null})).status,503);
});
test('invalid social/geo source does not create grant',async()=>{
 const e=env();
 let r=inIndia(request('/entry?s=x&c=post'));assert.equal((await worker.fetch(r,e)).status,404);
 r=inIndia(request('/entry?s=x&c=post','GET',{Referer:'https://evil.example/'}));assert.equal((await worker.fetch(r,e)).status,404);
 r=inIndia(request('/entry?s=instagram','GET',{Referer:'https://x.com/post'}));assert.equal((await worker.fetch(r,e)).status,404);
 r=inIndia(request('/entry?s=x','GET',{Referer:'https://x.com/post'}),'MY');assert.equal((await worker.fetch(r,e)).status,404);
 r=inIndia(request('/join?admission=garbage'));assert.equal((await worker.fetch(r,e)).status,404);
});
test('configure primary, backup and switch atomically',async()=>{
 const e=env();
 const a='https://chat.whatsapp.com/AAAAAAAAAAAAAAAAAAAAAA';
 const b='https://chat.whatsapp.com/BBBBBBBBBBBBBBBBBBBBBB';
 let r=await worker.fetch(admin('/admin/links/primary','PUT',{url:a,version:0}),e);
 assert.equal(r.status,200);
 r=await worker.fetch(admin('/admin/links/standby','PUT',{url:b,version:1}),e);assert.equal(r.status,200);
 r=await worker.fetch(admin('/admin/links/switch','POST',{version:2}),e);assert.equal(r.status,200);
 let state=(await r.json()).state;
 assert.equal(state.active_url,b);assert.equal(state.standby_url,null);
 r=await worker.fetch(admin('/admin/links/switch','POST',{version:2}),e);assert.equal(r.status,409);
 r=await worker.fetch(admin('/admin/links'),e);
 assert.ok((await r.json()).history.some(x=>x.action==='switch'));
});
test('shortlinks require allowlist and do not allow arbitrary destinations',async()=>{
 assert.equal(await allowedDestination('https://evil.example/foo',{SHORTLINK_ALLOWLIST:''}),false);
 assert.equal(await allowedDestination('http://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv',{}),false);
 assert.equal(await allowedDestination('https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv',{}),true);
});
test('india referral creates a one-time admission; join cannot be replayed or used abroad',async()=>{
 const e=env();const group='https://chat.whatsapp.com/CCCCCCCCCCCCCCCCCCCCCC';
 assert.equal((await worker.fetch(admin('/admin/links/primary','PUT',{url:group,version:0}),e)).status,200);
 let r=await worker.fetch(inIndia(request('/entry?s=x&c=firstpost','GET',{Referer:'https://x.com/user/status/12'})),e);
 assert.equal(r.status,303);
 const next=new URL(r.headers.get('Location')),token=next.searchParams.get('admission');
 assert.equal(token.length,48);
 let join=inIndia(request('/join?admission='+token));r=await worker.fetch(join,e);
 assert.equal(r.status,302);assert.equal(r.headers.get('Location'),group);
 r=await worker.fetch(inIndia(request('/join?admission='+token)),e);assert.equal(r.status,404);
 const other=await worker.fetch(inIndia(request('/entry?s=x','GET',{Referer:'https://x.com/p'})),e);
 const newToken=new URL(other.headers.get('Location')).searchParams.get('admission');
 r=await worker.fetch(inIndia(request('/join?admission='+newToken),'MY'),e);
 assert.equal(r.status,404);
});
test('disabled mode preserves existing v3.2 redirects',async()=>{
 const e={COMMUNITY_DESTINATION:'https://cc.stockscode.click'};
 const r=await worker.fetch(request('/join?c=old'),e);
 assert.equal(r.status,302);assert.equal(r.headers.get('Location'),'https://cc.stockscode.click');
});
