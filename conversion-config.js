/* Conversion V3.1 (public, non-secret settings).
 * Safe default: direct community links remain functional.
 * After deploying conversion-worker/, supply its verified HTTPS base URL.
 * Example: https://angel-conversions.<YOUR-SUBDOMAIN>.workers.dev
 * Do NOT enter any Cloudflare API tokens, auth keys or personal data here.
 */
window.AngelConversionConfig=Object.freeze({
  enabled: false,
  workerBase: '',
  destination: 'https://cc.stockscode.click',
  analyticsConsentKey: 'angelresearch_ga4_consent_v1',
  allowAnonymousAggregateWithoutChoice: true,
  campaignLanding: '/ipo-community.html'
});
