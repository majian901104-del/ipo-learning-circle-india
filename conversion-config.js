/* Conversion V3.1 (public, non-secret settings).
 * Enabled after the Cloudflare Worker reported {status:'ok',aggregate:true}.
 * The Worker redirects community clicks to the same fixed destination.
 * Do NOT enter any Cloudflare API tokens, auth keys or personal data here.
 */
window.AngelConversionConfig=Object.freeze({
  enabled: true,
  v33Enabled: true, // feature branch only; activate after Cloudflare D1 deployment
  workerBase: 'https://angel-research-conversion-v31.majian901104.workers.dev',
  destination: 'https://cc.stockscode.click',
  analyticsConsentKey: 'angelresearch_ga4_consent_v1',
  allowAnonymousAggregateWithoutChoice: true,
  campaignLanding: '/ipo-community.html'
});
