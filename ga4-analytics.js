/* Angel Research site analytics V2 — explicit independent choices; no automatic modal.
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
    campaign_source:clean(w.AngelCampaign?.get('utm_source')||q.get('utm_source')||q.get('source')||'direct'),
    campaign_medium:clean(w.AngelCampaign?.get('utm_medium')||q.get('utm_medium')||''),
    campaign_name:clean(w.AngelCampaign?.get('utm_campaign')||q.get('utm_campaign')||''),
    campaign_content:clean(q.get('utm_content')||'')
  };
}
function track(eventName,properties){
  if(!accepted||!valid||w.navigator?.globalPrivacyControl===true||w.navigator?.doNotTrack==='1'||typeof w.gtag!=='function')return false;
  if(!/^[a-z][a-z0-9_]{1,38}$/.test(eventName))return false;
  // No user names, phone numbers, emails, text input, full URLs or referral query strings.
  var safe=Object.assign(params(),properties||{});
  w.gtag('event',eventName,safe);return true;
}
var adKey='angelresearch_ads_measurement_v1',ads=false,gtmLoaded=false,consentInitialized=false;
function adChoice(){try{return w.localStorage.getItem(adKey)||''}catch(e){return ''}}
function blocked(){return w.navigator?.globalPrivacyControl===true||w.navigator?.doNotTrack==='1'||w.doNotTrack==='1'}
function consentState(){return {analytics_storage:accepted&&!blocked()?'granted':'denied',ad_storage:ads&&!blocked()?'granted':'denied',ad_user_data:ads&&!blocked()?'granted':'denied',ad_personalization:'denied'}}
function start(){
  if(!valid||blocked()||(!accepted&&!ads))return;
  if(!consentInitialized){
    w.dataLayer=w.dataLayer||[];
    w.gtag=w.gtag||function(){w.dataLayer.push(arguments)};
    w.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    consentInitialized=true;
  }
  w.gtag('consent','update',consentState());
  if(ads&&!gtmLoaded){
    w.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});
    var gtm=d.createElement('script');gtm.id='angel-gtm-container';gtm.async=true;gtm.src='https://www.googletagmanager.com/gtm.js?id=GTM-P795QL3K';
    gtmLoaded=true;gtm.onerror=function(){gtmLoaded=false;gtm.remove()};d.head.appendChild(gtm);
  }
  if(accepted&&!tagLoaded){
    tagLoaded=true;w['ga-disable-'+id]=false;w.gtag('js',new Date());
    w.gtag('config',id,{send_page_view:true,allow_google_signals:false,allow_ad_personalization_signals:false});
    var tag=d.createElement('script');tag.async=true;tag.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);
    tag.onerror=function(){tagLoaded=false;tag.remove()};d.head.appendChild(tag);
  }
}
function setChoice(value){
  remember(value);accepted=value==='granted';w['ga-disable-'+id]=!accepted;
  if(typeof w.gtag==='function')w.gtag('consent','update',consentState());
  start();
  try{w.dispatchEvent(new Event('angel-analytics-choice'))}catch(e){}
}
function preferences(){
  var footer=d.querySelector('footer')||d.querySelector('main')||d.body;
  var wrap=d.createElement('div');wrap.style.cssText='padding:12px 20px;text-align:center;background:#f1f5f5;color:#17394a;font:14px/1.5 Arial,sans-serif';
  var open=d.createElement('button');open.type='button';open.textContent='Privacy settings';open.style.cssText='background:transparent;color:#17394a;border:0;text-decoration:underline;cursor:pointer;padding:10px;font:inherit;min-height:44px';
  var panel=d.createElement('dialog');panel.style.cssText='width:min(440px,calc(100% - 32px));box-sizing:border-box;border:1px solid #b8cbd2;border-radius:10px;padding:22px;color:#17394a;background:#fff;font:16px/1.5 Arial,sans-serif';
  panel.setAttribute('aria-label','Privacy settings');
  panel.innerHTML='<h2 style="margin-top:0;font-size:23px">Privacy settings</h2><p>Optional measurement is off unless you choose to allow it. You can change your choices at any time.</p><label style="display:block;padding:10px 0"><input type="checkbox" id="ar-consent-analytics"> Website analytics (Google Analytics and optional site measurement)</label><label style="display:block;padding:10px 0"><input type="checkbox" id="ar-consent-ads"> Google Ads conversion measurement (advertising cookies and measurement data; no personalized advertising)</label><label style="display:block;padding:10px 0"><input type="checkbox" id="ar-consent-meta"> Meta advertising measurement (Facebook and Instagram Pixel on the community landing page; optional)</label><p><a href="/privacy.html">Privacy notice</a></p><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" data-save style="padding:12px;background:#143d50;color:white;border:0;border-radius:4px;cursor:pointer">Save preferences</button><button type="button" data-reject style="padding:12px;cursor:pointer">Reject all</button><button type="button" data-close style="padding:12px;cursor:pointer">Cancel</button></div><p role="status" data-status></p>';
  var an=panel.querySelector('#ar-consent-analytics'),ad=panel.querySelector('#ar-consent-ads'),meta=panel.querySelector('#ar-consent-meta');
  function apply(a,b,c){if(blocked()){a=false;b=false;c=false}try{w.localStorage.setItem('angelresearch_meta_measurement_v1',c?'granted':'denied')}catch(e){}ads=b;try{w.localStorage.setItem(adKey,b?'granted':'denied')}catch(e){}remember(a?'granted':'denied');accepted=a;w['ga-disable-'+id]=!a;if(typeof w.gtag==='function')w.gtag('consent','update',consentState());panel.close();w.location.reload()}
  open.addEventListener('click',function(){an.checked=accepted&&!blocked();ad.checked=ads&&!blocked();try{meta.checked=w.localStorage.getItem('angelresearch_meta_measurement_v1')==='granted'&&!blocked()}catch(e){meta.checked=false}an.disabled=ad.disabled=meta.disabled=blocked();panel.querySelector('[data-status]').textContent=blocked()?'Your browser privacy signal disables optional measurement.':'';panel.showModal()});
  panel.querySelector('[data-save]').addEventListener('click',function(){apply(an.checked,ad.checked,meta.checked)});
  panel.querySelector('[data-reject]').addEventListener('click',function(){apply(false,false,false)});
  panel.querySelector('[data-close]').addEventListener('click',function(){panel.close()});
  wrap.appendChild(open);footer.appendChild(wrap);d.body.appendChild(panel);
}
function init(){
  accepted=valid&&choice()==='granted'&&!blocked();ads=valid&&adChoice()==='granted'&&!blocked();
  w['ga-disable-'+id]=!accepted;
  start();preferences();
  d.addEventListener('click',function(e){
    var anchor=e.target&&e.target.closest?e.target.closest('a[href]'):null;
    if(!anchor)return;
    var raw=anchor.getAttribute('href')||'';
    // Measure only trusted user activation of a direct community registration link.
    // Opening the invitation dialog, auto-popup and page views are not conversions.
    try{
      var destination=new URL(anchor.href,w.location.href);
      var isJoin=destination.origin==='https://angel-research-conversion-v31.majian901104.workers.dev'&&destination.pathname==='/join';
      if(e.isTrusted&&e.button===0&&isJoin&&ads&&adChoice()==='granted'&&!blocked()&&gtmLoaded&&Array.isArray(w.dataLayer)){
        w.dataLayer.push({event:'ipo_join_button_click'});
      }
    }catch(_e){}

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
