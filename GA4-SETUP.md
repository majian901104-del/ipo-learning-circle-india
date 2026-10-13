# Angel Research — Google Analytics 4 setup

Website: `https://angelresearchindia.com/`

## Status
- GitHub Pages build injects `ga4-config.js` and `ga4-analytics.js` into **every HTML page**.
- GA4 measurement ID **G-XWHQLEFTG2** is configured. GA4 only sends data for users who accept optional analytics; browser privacy signals are respected.
- V3.1 also injects `conversion-config.js` and `conversion-tracker.js` into every HTML page. The independent aggregate service is **disabled** until a separately deployed Worker URL is verified.
- No credentials, OAuth tokens, passwords, API secrets or Service Account JSON are needed or safe to place in these static files.

## Measurement ID and attribution status
The active Google Analytics 4 web data stream uses measurement ID `G-XWHQLEFTG2`.
Independent aggregated conversion reporting is prepared but not yet enabled. Follow [V3.1 activation and privacy guidelines](V3-CONVERSION-SETUP.md) before activating.

## Event naming
- `page_view`: sent by the standard GA4 tag, after consent.
- `join_community_click`: click on a marked community anchor (direct link or V3.1 Worker redirect). Button location is included. **Not a successful join**.
- `request_updates_click`: click through to the optional lead form.
- `generate_lead`: acknowledged successful, non-duplicate lead submission by the Google Apps Script endpoint.
Avoid using a second container or hardcoded gtag snippet, which can double-count events.

## Verify
1. Open the website in a **fresh browser profile** without an ad blocker (or clear this site's optional analytics choice).
2. Click **Allow analytics**. Until a valid ID is configured, the banner does not appear and no data is sent.
3. GA4 → Reports → Realtime: confirm your page visit.
4. Click an IPO community button. In Realtime / DebugView, check `join_community_click`.
5. Submit a new genuine lead from `apply.html` only when the form is operating; verify `generate_lead`.
6. In GA4 Admin → Data display → Events / Key events, mark **join_community_click** as a key event if useful. This measures outbound clicks, **not** confirmed WhatsApp memberships.
7. Use campaign-specific links, for example:
   `https://angelresearchindia.com/ipo-community.html?utm_source=x&utm_medium=influencer&utm_campaign=gurjot_ipo`
   Avoid adding phone numbers, emails or other personal data to URLs.

## Important limits
- GA4 only observes visitors who permit measurement and are not blocking the Google tag. The separate V3.1 aggregate layer, once explicitly activated, is not a substitute for user-level analytics.
- Click counts, GA4 sessions and verified WhatsApp group joins are different things.
- To reconcile actual group membership, use administrator records and a reliable campaign-specific invitation mechanism.
- The code stores the optional analytics preference in localStorage. Visitors can withdraw permission through the Privacy page.
- This repository does not contain or create a Google Analytics property. The property and Web Data Stream must be controlled by the site owner.
