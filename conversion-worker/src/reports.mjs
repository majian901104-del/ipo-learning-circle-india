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
    if(event!=='join_click'&&event!=='page_view')continue;
    const key=source+'|'+campaign;
    if(!map.has(key))map.set(key,{source,campaign,views:0,redirects:0});
    const rec=map.get(key);
    if(event==='join_click')rec.redirects+=metric(row);
    else rec.views+=metric(row);
  }
  return Array.from(map.values()).sort((a,b)=>b.views-a.views||b.redirects-a.redirects).slice(0,150);
}
function daily(rows){
  const map=new Map();
  for(const row of rows){
    const day=String(row.day||'').slice(0,10);
    if(!/^\d{4}-\d\d-\d\d$/.test(day))continue;
    if(!map.has(day))map.set(day,{day,views:0,redirects:0});
    const rec=map.get(day);
    if(row.event==='page_view')rec.views+=metric(row);
    else if(row.event==='join_click')rec.redirects+=metric(row);
  }
  return Array.from(map.values()).sort((a,b)=>a.day.localeCompare(b.day));
}
function countries(rows){
  const map=new Map();
  for(const row of rows){
    if(row.event!=='page_view')continue;
    const country=String(row.country||'unknown').toUpperCase().slice(0,8);
    map.set(country,(map.get(country)||0)+metric(row));
  }
  return Array.from(map.entries()).map(([country,views])=>({country,views}))
    .sort((a,b)=>b.views-a.views).slice(0,30);
}
function totals(campaigns){
  return campaigns.reduce((a,v)=>({
    views:a.views+v.views,redirects:a.redirects+v.redirects
  }),{views:0,redirects:0});
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
  const grouped=\`SELECT blob3 AS campaign, blob4 AS source, blob1 AS event, COUNT(*) AS total
    FROM \${DATASET}
    WHERE timestamp >= $start
    GROUP BY blob3, blob4, blob1 ORDER BY total DESC LIMIT 500\`;
  const timeseries=\`SELECT toDate(timestamp) AS day, blob1 AS event, COUNT(*) AS total
    FROM \${DATASET}
    WHERE timestamp >= $start
    GROUP BY day, blob1 ORDER BY day ASC LIMIT 90\`;
  const byCountry=\`SELECT blob6 AS country, blob1 AS event, COUNT(*) AS total
    FROM \${DATASET}
    WHERE timestamp >= $start
    GROUP BY blob6, blob1 ORDER BY total DESC LIMIT 100\`;
  try{
    const responses=await Promise.all([
      env.ANALYTICS_SQL.query({query:grouped,params}),
      env.ANALYTICS_SQL.query({query:timeseries,params}),
      env.ANALYTICS_SQL.query({query:byCountry,params})
    ]);
    if(responses.some(x=>!x||!Array.isArray(x.data)))throw new Error('Unexpected Analytics SQL response');
    const campaigns=summarize(responses[0].data);
    return json({ok:true,days,asOf:new Date().toISOString(),start,
      sourceType:'Cloudflare Analytics Engine aggregate events',
      countsAre:'approximate event requests, not unique people or successful joins',
      campaigns,totals:totals(campaigns),
      daily:daily(responses[1].data),
      countries:countries(responses[2].data)
    },200,origin);
  }catch(err){
    // Never reflect internal SQL details, credentials, or raw rows to the client.
    console.error('Private report query failed',err?.message||'unknown');
    return json({error:'report_query_unavailable',
      message:'Cloudflare aggregate query failed. Recheck the binding and dashboard.'},502,origin);
  }
}
