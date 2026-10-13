/* GitHub Pages build step: add the same privacy-respecting GA4 integration to
 * every HTML page, including future pages. This edits the Actions checkout
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
    if(s.includes('src="ga4-analytics.js"') || s.includes('/ga4-analytics.js"')){skipped++;continue}
    if(!/<\/head\s*>/i.test(s))throw new Error('HTML has no closing head: '+full);
    const rel=path.relative(path.dirname(full),root).replace(/\\/g,'/');
    const prefix=rel?rel+'/':'';
    const scripts='<script src="'+prefix+'ga4-config.js" defer></script>\n'
       +'<script src="'+prefix+'ga4-analytics.js" defer></script>\n';
    s=s.replace(/<\/head\s*>/i,scripts+'</head>');
    fs.writeFileSync(full,s,'utf8');
    injected++;
  }
}
visit(root);
if(found===0||injected===0&&skipped===0)throw new Error('No HTML pages processed');
console.log('GA4 build injection: '+injected+' HTML pages updated, '+skipped+' previously tagged, '+found+' scanned.');
