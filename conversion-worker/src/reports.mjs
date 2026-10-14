/* Angel Research V3.2 private analytics read API.
 * Data source: Cloudflare Analytics SQL binding (no API token or account ID).
 * Access to /report requires Cloudflare secret REPORT_ACCESS_KEY.
 * No raw event-level data, names, phone numbers, IPs or browser IDs are returned.
 * Tokens are never accepted in URLs and must never be stored in GitHub.
 */
const REPORT_ORIGINS=new Set([
  'https://angelresearchindia.com',
  'https://www.angelresearchindia.com',
  'https://majian901104-del.github.io'
]);
const DATASET='events.analyticsEngine.angel_research_conversion_v31';
function authCors(origin){
  return {
    'Cache-Control':'no-store, private',
    'Pragma':'no-cache',
    'Vary':'Origin',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    ...(REPORT_ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{})
  };
}
function json(data,status,origin){
  return new Response(JSON.stringify(data),{
    status,
    headers:{...authCors(origin),'Content-Type':'application/json; charset=utf-8'}
  });
}
async function secureEqual(a,b){
  if(typeof a!=='string'||typeof b!=='string'||a.length>512||b.length<32)return false;
  const encode=new TextEncoder();
  const [da,db]=await Promise.all([
    crypto.subtle.digest('SHA-256',encode.encode(a)),
    crypto.subtle.digest('SHA-256',encode.encode(b))
  ]);
  const aa=new Uint8Array(da),bb=new Uint8Array(db);
  let diff=0;for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];
  return diff===0;
}
function metric(row){
  const n=Number(row.total);
  return Number.isFinite(n)&&n>=0?Math.round(n):0;
}
function summarize(rows){
  const map=new Map();
  for(const row of rows){
    const campaign=String(row.campaign||'direct').slice(0,48);
    const source=String(row.source||'direct').slice(0,32);
    const event=String(row.event||'');
    if(!['join_click','page_view','page_session','join_session'].includes(event))continue;
    const key=source+'|'+campaign;
    if(!map.has(key))map.set(key,{source,campaign,views:0,redirects:0,visitorSessions:0,clickSessions:0});
    const rec=map.get(key);
    if(event==='join_click')rec.redirects+=metric(row);
    else if(event==='page_view')rec.views+=metric(row);
    else if(event==='page_session')rec.visitorSessions+=metric(row);
    else if(event==='join_session')rec.clickSessions+=metric(row);
  }
  return Array.from(map.values()).sort((a,b)=>b.views-a.views||b.redirects-a.redirects).slice(0,150);
}
function daily(rows){
  const map=new Map();
  for(const row of rows){
    const day=String(row.day||'').slice(0,10);
    if(!/^\d{4}-\d\d-\d\d$/.test(day))continue;
    if(!map.has(day))map.set(day,{day,views:0,redirects:0,visitorSessions:0,clickSessions:0});
    const rec=map.get(day);
    if(row.event==='page_view')rec.views+=metric(row);
    else if(row.event==='join_click')rec.redirects+=metric(row);
    else if(row.event==='page_session')rec.visitorSessions+=metric(row);
    else if(row.event==='join_session')rec.clickSessions+=metric(row);
  }
  return Array.from(map.values()).sort((a,b)=>a.day.localeCompare(b.day));
}
function countries(rows){
  const map=new Map(),regions=new Map();
  for(const row of rows){
    if(row.event!=='page_view')continue;
    const country=String(row.country||'unknown').toUpperCase().slice(0,8);
    const region=String(row.region||'unknown').toUpperCase().slice(0,15);
    map.set(country,(map.get(country)||0)+metric(row));
    const key=country+'|'+region;
    regions.set(key,(regions.get(key)||0)+metric(row));
  }
  return {
    countries:Array.from(map.entries()).map(([country,views])=>({country,views}))
      .sort((a,b)=>b.views-a.views).slice(0,30),
    regions:Array.from(regions.entries()).map(([key,views])=>{
      const pos=key.indexOf('|');
      return {country:key.slice(0,pos),region:key.slice(pos+1),views};
    }).sort((a,b)=>b.views-a.views).slice(0,50)
  };
}
function deviceGroups(rows){
  const map=new Map(),models=new Map();
  for(const row of rows){
    if(row.event!=='page_view')continue;
    const device=String(row.device||'unknown').slice(0,12);
    const os=String(row.os||'unknown').slice(0,16);
    const model=String(row.model||'unknown').slice(0,36);
    const key=device+'|'+os;
    map.set(key,(map.get(key)||0)+metric(row));
    if(model!=='unknown'&&model!==''){const mkey=os+'|'+model;models.set(mkey,(models.get(mkey)||0)+metric(row))}
  }
  return {
    devices:Array.from(map.entries()).map(([key,views])=>{
      const pos=key.indexOf('|');
      return {device:key.slice(0,pos),os:key.slice(pos+1),views};
    }).sort((a,b)=>b.views-a.views).slice(0,35),
    // Suppress rare model group counts to reduce inference from individual visits.
    models:Array.from(models.entries()).map(([key,views])=>{
      const pos=key.indexOf('|');
      return {os:key.slice(0,pos),model:key.slice(pos+1),views};
    }).filter(v=>v.views>=3).sort((a,b)=>b.views-a.views).slice(0,20)
  };
}
function addIndiaBreakdown(campaigns,rows){
  const index=new Map(campaigns.map(c=>[c.source+'|'+c.campaign,c]));
  for(const c of campaigns){c.indiaViews=0;c.indiaRedirects=0}
  for(const row of rows){
    const item=index.get(String(row.source||'direct')+'|'+String(row.campaign||'direct'));
    if(!item)continue;
    if(row.event==='page_view')item.indiaViews+=metric(row);
    if(row.event==='join_click')item.indiaRedirects+=metric(row);
  }
}
function totals(campaigns){
  return campaigns.reduce((a,v)=>({
    views:a.views+v.views,redirects:a.redirects+v.redirects,
    visitorSessions:a.visitorSessions+v.visitorSessions,
    clickSessions:a.clickSessions+v.clickSessions
  }),{views:0,redirects:0,visitorSessions:0,clickSessions:0});
}
export async function handleReport(request,env){
  const origin=request.headers.get('Origin')||'';
  if(request.method==='OPTIONS'){
    if(!REPORT_ORIGINS.has(origin))return json({error:'Forbidden origin'},403,origin);
    return new Response(null,{status:204,headers:{
      ...authCors(origin),
      'Access-Control-Allow-Methods':'GET,OPTIONS',
      'Access-Control-Allow-Headers':'Authorization',
      'Access-Control-Max-Age':'3600'
    }});
  }
  if(request.method!=='GET')return json({error:'Method not allowed'},405,origin);
  if(origin&&!REPORT_ORIGINS.has(origin))return json({error:'Forbidden origin'},403,origin);
  // Fail closed when the private owner secret or the Analytics SQL binding is absent.
  if(typeof env.REPORT_ACCESS_KEY!=='string'||env.REPORT_ACCESS_KEY.length<32||!env.ANALYTICS_SQL){
    return json({error:'reporting_not_configured',
      message:'Configure REPORT_ACCESS_KEY as a Worker secret and Analytics SQL binding.'},503,origin);
  }
  const auth=request.headers.get('Authorization')||'';
  const supplied=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(!await secureEqual(supplied,env.REPORT_ACCESS_KEY)){
    return json({error:'unauthorized',message:'Invalid access key'},401,origin);
  }
  const url=new URL(request.url);
  const dayString=url.searchParams.get('days')||'7';
  if(!['1','7','30'].includes(dayString))return json({error:'unsupported_range'},400,origin);
  const days=Number(dayString);
  const start=new Date(Date.now()-days*86400000).toISOString();
  const params={start};
  // Bounded server-side filters apply consistently to ALL dashboard panels.
  const excludeTest=url.searchParams.get('exclude_test')==='1';
  const cleanClause=excludeTest?" AND blob3 NOT LIKE 'test%' AND blob3 NOT LIKE 'qa_%' AND blob3 NOT LIKE 'internal_%'":'';
  const grouped=`SELECT blob3 AS campaign, blob4 AS source, blob1 AS event, COUNT(*) AS total
    FROM ${DATASET}
    WHERE timestamp >= $start${cleanClause}
    GROUP BY blob3, blob4, blob1 ORDER BY total DESC LIMIT 500`;
  const timeseries=`SELECT toDate(timestamp) AS day, blob1 AS event, COUNT(*) AS total
    FROM ${DATASET}
    WHERE timestamp >= $start${cleanClause}
    GROUP BY day, blob1 ORDER BY day ASC LIMIT 90`;
  const byCountry=`SELECT blob6 AS country, blob10 AS region, blob1 AS event, COUNT(*) AS total
    FROM ${DATASET}
    WHERE timestamp >= $start${cleanClause}
    GROUP BY blob6, blob10, blob1 ORDER BY total DESC LIMIT 300`;
  const byDevice=`SELECT blob7 AS device, blob8 AS os, blob9 AS model, blob1 AS event, COUNT(*) AS total
    FROM ${DATASET}
    WHERE timestamp >= $start${cleanClause}
    GROUP BY blob7, blob8, blob9, blob1 ORDER BY total DESC LIMIT 300`;
  const indianCampaigns=`SELECT blob3 AS campaign, blob4 AS source, blob1 AS event, COUNT(*) AS total
    FROM ${DATASET}
    WHERE timestamp >= $start${cleanClause} AND blob6 = 'in' AND blob1 IN ('page_view', 'join_click')
    GROUP BY blob3, blob4, blob1 ORDER BY total DESC LIMIT 300`;
  try{
    const responses=await Promise.all([
      env.ANALYTICS_SQL.query({query:grouped,params}),
      env.ANALYTICS_SQL.query({query:timeseries,params}),
      env.ANALYTICS_SQL.query({query:byCountry,params}),
      env.ANALYTICS_SQL.query({query:byDevice,params}),
      env.ANALYTICS_SQL.query({query:indianCampaigns,params})
    ]);
    if(responses.some(x=>!x||!Array.isArray(x.data)))throw new Error('Unexpected Analytics SQL response');
    const campaigns=summarize(responses[0].data);
    addIndiaBreakdown(campaigns,responses[4].data);
    const geo=countries(responses[2].data);
    const hardware=deviceGroups(responses[3].data);
    return json({ok:true,days,asOf:new Date().toISOString(),start,
      sourceType:'Cloudflare Analytics Engine aggregate events',
      countsAre:env.ANALYTICS_IP_DEDUP_ENABLED==='true'?'Events recorded after enabling are limited to one count per public IP per rolling 24h for each of page_view and join_click. Earlier aggregate events are not recalculated. IPs are not individuals or confirmed WhatsApp joins.':'Event counts include repeats. Browser tab estimates are NOT verified unique visitors or confirmed WhatsApp joins.',
      ipDedup:{enabled:env.ANALYTICS_IP_DEDUP_ENABLED==='true',hours:Math.max(1,Math.min(168,Number(env.ANALYTICS_IP_DEDUP_HOURS)||24)),historicalEventsNotReprocessed:true,scope:'statistics_only'},
      excludeTest,
      campaigns,totals:totals(campaigns),
      daily:daily(responses[1].data),
      countries:geo.countries,regions:geo.regions,
      devices:hardware.devices,models:hardware.models
    },200,origin);
  }catch(err){
    // Never reflect internal SQL details, credentials, or raw rows to the client.
    console.error('Private report query failed',err?.message||'unknown');
    return json({error:'report_query_unavailable',
      message:'Cloudflare aggregate query failed. Recheck the binding and dashboard.'},502,origin);
  }
}
