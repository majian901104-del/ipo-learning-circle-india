/* Angel Research Conversion Worker V3.1.
 * Route /collect: anonymous aggregate page-view counter.
 * Route /join: privacy-conscious community redirect + aggregate count.
 * NO cookies, IDs, IP, user agent, full URL, referrer, device fingerprints
 * or form field values are written to the analytics dataset.
 * This is an optional component; it is NOT deployed by GitHub Pages.
 *
 * The same Worker may be used with a custom first-party tracking subdomain
 * configured in Cloudflare, or with an *.workers.dev host.
 */
'use strict';
const DEFAULT_JOIN='https://cc.stockscode.click';
const ALLOW_ORIGINS=new Set([
 'https://angelresearchindia.com',
 'https://www.angelresearchindia.com',
 'https://majian901104-del.github.io'
]);
function scalar(s,limit=50){
  s=String(s||'').toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,limit);
  return s||'direct';
}
function safePath(s){
  s=String(s||'').slice(0,120);
  return /^\/[a-z0-9/_-]{0,110}(?:\.html)?$/i.test(s)?s:'/other';
}
function noAnalytics(req){
  return req.headers.get('DNT')==='1'||req.headers.get('Sec-GPC')==='1';
}
function record(env,request,kind,fields){
  if(!env.ANALYTICS||noAnalytics(request))return;
  try{
    // The event timestamp is managed by Analytics Engine.
    // Only aggregated, non-identifying dimensions are retained.
    env.ANALYTICS.writeDataPoint({
      blobs:[
        kind,
        safePath(fields.path),
        scalar(fields.campaign,48),
        scalar(fields.source,32),
        scalar(fields.medium,32),
        scalar(request.cf?.country||'unknown',3)
      ],
      doubles:[1],
      indexes:['v31']
    });
  }catch(_ignored){
    // Analytics outages must never interrupt the user journey.
  }
}
function cors(origin){
  return {'Cache-Control':'no-store','Vary':'Origin',
    ...(ALLOW_ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{})};
}
function reply(body,status,headers){
  return new Response(body,{status,headers});
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  const origin=request.headers.get('Origin')||'';
  if(url.pathname==='/health' && request.method==='GET'){
    return reply(JSON.stringify({status:'ok',aggregate:!!env.ANALYTICS}),
      200,{'Content-Type':'application/json','Cache-Control':'no-store'});
  }
  if(url.pathname==='/collect'){
    if(request.method==='OPTIONS'){
      if(!ALLOW_ORIGINS.has(origin))return reply(null,403,{'Cache-Control':'no-store'});
      return reply(null,204,{...cors(origin),'Access-Control-Allow-Methods':'POST,OPTIONS',
        'Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'3600'});
    }
    if(request.method!=='POST')return reply(null,405,{'Allow':'POST,OPTIONS'});
    if(!ALLOW_ORIGINS.has(origin))return reply(null,403,{'Cache-Control':'no-store'});
    if(Number(request.headers.get('Content-Length')||0)>512)return reply(null,413,cors(origin));
    if(noAnalytics(request))return reply(null,204,cors(origin));
    let body;try{
      const raw=await request.text();
      if(raw.length>512)return reply(null,413,cors(origin));
      body=JSON.parse(raw);
    }catch(_e){return reply(null,400,cors(origin))}
    if(!body||body.event!=='page_view'||typeof body!=='object')
      return reply(null,400,cors(origin));
    record(env,request,'page_view',{
      path:body.path,campaign:body.campaign,source:body.source,medium:body.medium
    });
    return reply(null,204,cors(origin));
  }
  if(url.pathname==='/join'){
    if(request.method!=='GET')return reply(null,405,{'Allow':'GET'});
    // Always redirect to one pre-approved external invitation.
    // The user-provided destination never comes from URL parameters.
    const destination=env.COMMUNITY_DESTINATION||DEFAULT_JOIN;
    if(!/^https:\/\/cc\.stockscode\.click\/?$/i.test(destination)){
      return reply('Invalid community destination configuration',503,
        {'Cache-Control':'no-store','Content-Type':'text/plain'});
    }
    const mode=request.headers.get('Sec-Fetch-Mode');
    // Avoid counting non-navigation fetch/prefetch requests.
    if(!mode||mode==='navigate'){
      record(env,request,'join_click',{
        path:'/join',campaign:url.searchParams.get('c'),
        source:url.searchParams.get('s'),medium:url.searchParams.get('m')
      });
    }
    return reply(null,302,{
      'Location':destination,
      'Cache-Control':'no-store',
      'Referrer-Policy':'no-referrer',
      'X-Robots-Tag':'noindex, nofollow'
    });
  }
  return reply('Not found',404,{'Cache-Control':'no-store'});
 }
};
