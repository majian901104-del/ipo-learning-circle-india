/* GitHub Pages build step: add the same privacy-respecting GA4 integration to
 * every HTML page, including future pages.
 * V3.1 also preloads an independent, safe-disabled aggregate counting module. This edits the Actions checkout
 * only; it does not rewrite each source page in the GitHub repository.
 * No tag is sent until ga4-config.js contains a valid G- ID and the visitor
 * explicitly accepts optional analytics in their browser.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd();
let found=0,injected=0,skipped=0;
function visit(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.name.startsWith('.') || entry.name==='node_modules')continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) {visit(full);continue}
    if(!entry.isFile() || !/\.html$/i.test(entry.name))continue;
    found++;
    let s=fs.readFileSync(full,'utf8');
    const assetPrefix=path.relative(path.dirname(full),root).replace(/\\/g,'/');
    const uiPrefix=assetPrefix?assetPrefix+'/':'';
    // Append the shared UI after page-specific CSS; do not add analytics to private pages.
    if(/<link\b[^>]*rel=["']stylesheet["']/i.test(s)&&!s.includes('v45-responsive-polish.css')){
      s=s.replace(/<\/head\s*>/i,'<link rel="stylesheet" href="'+uiPrefix+'v45-responsive-polish.css?v=20261128-v45c">\n</head>');
    }
    // Preserve the first image and all explicit loading priorities. Only defer
    // later images that already declare intrinsic dimensions, reducing layout shift risk.
    let imageIndex=0;
    s=s.replace(/<img\b[^>]*>/gi,tag=>{
      imageIndex++;
      if(imageIndex===1||/\b(?:loading|fetchpriority)\s*=/i.test(tag)||!(/\bwidth\s*=/.test(tag)&&/\bheight\s*=/.test(tag)))return tag;
      return tag.replace(/\s*\/?>$/,' loading="lazy"'+(/\bdecoding\s*=/i.test(tag)?'':' decoding="async"')+'>');
    });
    fs.writeFileSync(full,s,'utf8');
    // Private reporting pages must not inflate the public marketing funnel.
    if(entry.name==='analytics-dashboard.html'){skipped++;continue}
    // Rewrite legacy public CTAs to our controlled Cloudflare /join entry.
    // Admission enforcement is deliberately disabled until the rollout is tested.
    const original=s;
    s=s.replace(/<script\b[^>]*src=["'][^"']*ipo-invite-popup\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'');
    if(entry.name!=='ipo-community.html'){
    s=s.replace(/<\/body\s*>/i,'<script src="'+uiPrefix+'ipo-invite-popup.js?v=20261128-v7" defer></script></body>');
    }
    s=s.replace(/<script\b[^>]*src=["'][^"']*campaign-attribution-v7\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'');
    s=s.replace(/<\/head\s*>/i,'<script src="'+uiPrefix+'campaign-attribution-v7.js?v=2"></script></head>');
    s=s.replace(/ga4-analytics\.js(?:\?[^"']*)?(?=["'])/g,'ga4-analytics.js?v=20261129-meta1');
    s=s.replace(/href=(["'])https:\/\/cc\.stockscode\.click\/?\1/gi,
       'href="https://angel-research-conversion-v31.majian901104.workers.dev/join" data-conversion-join');
    if(/src=["'][^"']*ga4-analytics\.js(?:\?[^"']*)?["']/i.test(s)){
      if(s!==original)fs.writeFileSync(full,s,'utf8');
      skipped++;continue
    }
    if(!/<\/head\s*>/i.test(s))throw new Error('HTML has no closing head: '+full);
    const rel=path.relative(path.dirname(full),root).replace(/\\/g,'/');
    const prefix=rel?rel+'/':'';
    const scripts='<script src="'+prefix+'conversion-config.js" defer></script>\n'
       +'<script src="'+prefix+'link-entry-v34.js" defer></script>\n'
       +'<script src="'+prefix+'ga4-config.js" defer></script>\n'
       +'<script src="'+prefix+'ga4-analytics.js?v=20261129-meta1" defer></script>\n'
       +'<script src="'+prefix+'conversion-tracker.js" defer></script>\n';
    s=s.replace(/<\/head\s*>/i,scripts+'</head>');
    if(/href=(["'])https:\/\/cc\.stockscode\.click\/?\1/i.test(s))throw new Error('Legacy CTA remained in '+full);
    fs.writeFileSync(full,s,'utf8');
    injected++;
  }
}
visit(root);
if(found===0||injected===0&&skipped===0)throw new Error('No HTML pages processed');
console.log('GA4 build injection: '+injected+' HTML pages updated, '+skipped+' previously tagged, '+found+' scanned.');
