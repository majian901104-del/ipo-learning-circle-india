/* Angel Research site analytics V1.
 * Uses GA4 only after visitor consent AND after a valid G- measurement ID
 * has been configured; no PII or WhatsApp number is transmitted.
 * Cookie consent is stored per browser/origin, not cross-device.
 */
(function(w,d){
'use strict';
var cfg=w.AngelGA4Config||{};
var id=typeof cfg.measurementId==='string'?cfg.measurementId.trim().toUpperCase():'';
var valid=/^G-[A-Z0-9]{6,20}$/.test(id);
var key=cfg.consentKey||'angelresearch_ga4_consent_v1';
var accepted=false,tagLoaded=false;
var analyticsEvents=['join_community_click','request_updates_click','generate_lead'];
function choice(){try{return w.localStorage.getItem(key)||''}catch(e){return ''}}
function remember(v){try{w.localStorage.setItem(key,v)}catch(e){}}
function params(){
  var q=new URLSearchParams(w.location.search);
  function clean(s){return String(s||'').slice(0,100)}
  return {
    campaign_source:clean(q.get('utm_source')||q.get('source')||'direct'),
    campaign_medium:clean(q.get('utm_medium')||''),
    campaign_name:clean(q.get('utm_campaign')||''),
    campaign_content:clean(q.get('utm_content')||'')
  };
}
function track(eventName,properties){
  if(!accepted||!valid||typeof w.gtag!=='function')return false;
  if(!/^[a-z][a-z0-9_]{1,38}$/.test(eventName))return false;
  // No user names, phone numbers, emails, text input, full URLs or referral query strings.
  var safe=Object.assign(params(),properties||{});
  w.gtag('event',eventName,safe);return true;
}
function start(){
  if(!valid||tagLoaded||!accepted||w.navigator?.globalPrivacyControl===true||w.navigator?.doNotTrack==='1')return;
  tagLoaded=true;
  w.dataLayer=w.dataLayer||[];
  w.gtag=function(){w.dataLayer.push(arguments)};
  w.gtag('js',new Date());
  w.gtag('consent','default',{
    analytics_storage:'granted',
    ad_storage:'denied',
    ad_user_data:'denied',
    ad_personalization:'denied'
  });
  w.gtag('config',id,{send_page_view:true,allow_google_signals:false,allow_ad_personalization_signals:false});
  var tag=d.createElement('script');tag.async=true;tag.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);
  tag.onerror=function(){tagLoaded=false};
  d.head.appendChild(tag);
}
function setChoice(value){
  remember(value);accepted=value==='granted';
  // Inform the cookieless conversion module of explicit acceptance/rejection.
  // A rejection disables both optional GA4 and independent aggregate events.
  try{w.dispatchEvent(new Event('angel-analytics-choice'))}catch(_e){}
  if(accepted){if(valid)w['ga-disable-'+id]=false;start();}
  else if(valid){
    w['ga-disable-'+id]=true;
    if(typeof w.gtag==='function')w.gtag('consent','update',{analytics_storage:'denied'});
  }
  var banner=d.getElementById('angel-consent-banner');if(banner)banner.remove();
}
function makeBanner(){
  if(!valid||choice()||d.getElementById('angel-consent-banner'))return;
  var style=d.createElement('style');
  style.id='angel-consent-style';
  style.textContent='#angel-consent-banner{position:fixed;z-index:99999;left:12px;right:12px;bottom:80px;max-width:600px;margin:0 auto;box-sizing:border-box;background:#fff;color:#17394a;padding:17px 20px;border:1px solid #c9d7dc;border-radius:8px;box-shadow:0 12px 36px #001c3040;font:14px/1.55 Arial,Helvetica,sans-serif}#angel-consent-banner p{font:14px/1.55 Arial,Helvetica,sans-serif;margin:5px 0 12px;color:#536976}#angel-consent-banner a{text-decoration:underline}#angel-consent-actions{display:flex;gap:10px;flex-wrap:wrap}#angel-consent-actions button{border:1px solid #143d50;background:#143d50;color:#fff;padding:11px 17px;border-radius:4px;cursor:pointer;font:700 13px Arial;min-height:42px}#angel-consent-actions button:last-child{background:white;color:#143d50}@media(min-width:760px){#angel-consent-banner{left:24px;right:auto;bottom:24px}}@media(max-width:700px){#angel-consent-banner{left:12px;right:12px;bottom:12px;padding:12px 15px;max-width:500px}#angel-consent-banner p{font:13px/1.45 Arial,Helvetica,sans-serif;margin:5px 0 9px}#angel-consent-actions{gap:8px}#angel-consent-actions button{flex:1;min-width:110px;min-height:44px;padding:9px 11px}}';
  d.head.appendChild(style);
  var block=d.createElement('div');block.id='angel-consent-banner';block.setAttribute('role','region');block.setAttribute('aria-label','Optional website analytics');
  var title=d.createElement('strong');title.textContent='Optional analytics';
  var p=d.createElement('p');p.appendChild(d.createTextNode('Allow optional analytics for site visits and community-link clicks? Names and WhatsApp numbers are not sent to Google Analytics. '));
  var link=d.createElement('a');link.href='privacy.html';link.textContent='Privacy details';p.appendChild(link);
  var actions=d.createElement('div');actions.id='angel-consent-actions';
  var yes=d.createElement('button');yes.type='button';yes.textContent='Allow analytics';yes.addEventListener('click',function(){setChoice('granted')});
  var no=d.createElement('button');no.type='button';no.textContent='No thanks';no.addEventListener('click',function(){setChoice('denied')});
  actions.appendChild(yes);actions.appendChild(no);block.appendChild(title);block.appendChild(p);block.appendChild(actions);d.body.appendChild(block);
}
function optOutControl(){
  // On privacy page, let returning users withdraw earlier permission.
  if(!/\/privacy\.html$/.test(w.location.pathname))return;
  var main=d.querySelector('main .article')||d.querySelector('main');if(!main)return;
  var wrap=d.createElement('p');wrap.style.padding='14px';wrap.style.background='#f2f6f6';
  var label=d.createElement('strong');label.textContent='Analytics preferences: ';wrap.appendChild(label);
  var b=d.createElement('button');b.type='button';b.textContent='Reject optional analytics';b.style.cssText='padding:8px 13px;cursor:pointer;border:1px solid #1c485a;background:#fff;color:#1c485a;font:700 13px Arial';
  b.addEventListener('click',function(){setChoice('denied');b.textContent='Analytics disabled in this browser';});
  wrap.appendChild(b);main.appendChild(wrap);
}
function init(){
  if(valid&&choice()==='granted'){accepted=true;start();}
  else if(valid&&choice()==='denied'){accepted=false;}
  else{makeBanner();}
  optOutControl();
  d.addEventListener('click',function(e){
    var anchor=e.target&&e.target.closest?e.target.closest('a[href]'):null;
    if(!anchor)return;
    var raw=anchor.getAttribute('href')||'';
    if(anchor.hasAttribute('data-conversion-join') || /^https:\/\/cc\.stockscode\.click\/?([?#].*)?$/i.test(raw)){
      track('join_community_click',{button_location:(anchor.getAttribute('data-cta')||anchor.getAttribute('data-community')||'site_link').slice(0,50),destination_type:'community_link'});
    }else if(/(?:^|\/)apply\.html(?:[?#]|$)/i.test(raw)){
      track('request_updates_click',{button_location:'research_form_link'});
    }
  },true);
}
w.AngelAnalytics={track:track,consent:setChoice,isEnabled:function(){return valid&&accepted},configured:valid,
  requiredEvents:analyticsEvents.slice()};
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
