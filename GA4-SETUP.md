# Angel Research — Google Analytics 4 setup

Website: `https://angelresearchindia.com/`

## Status
- GitHub Pages build injects `ga4-config.js` and `ga4-analytics.js` into **every HTML page**.
- Analytics will **not** send any data until:
  1. The owner enters a valid GA4 Web Data Stream **Measurement ID** in `ga4-config.js`.
  2. The visitor chooses **Allow analytics** in the optional analytics banner.
- No credentials, OAuth tokens, passwords, API secrets or Service Account JSON are needed or safe to place in these static files.

## Obtain the Measurement ID
1. Open https://analytics.google.com/ and select or create the property for Angel Research.
2. Admin → Data streams → Web → choose the data stream with URL `https://angelresearchindia.com/`.
3. Copy its **Measurement ID**, which looks like `G-XXXXXXXXXX`.
4. Edit the single line `measurementId: ''` in `ga4-config.js` to `measurementId: 'G-YOUR-REAL-ID'`.
5. Commit to main. GitHub Pages will redeploy automatically.

## Event naming
- `page_view`: sent by the standard GA4 tag, after consent.
- `join_community_click`: click on an anchor pointed at `https://cc.stockscode.click`. Button location is included. **Not a successful join**.
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
- Analytics only observes visitors who permit measurement and are not blocking the Google tag.
- Click counts, GA4 sessions and verified WhatsApp group joins are different things.
- To reconcile actual group membership, use administrator records and a reliable campaign-specific invitation mechanism.
- The code stores the optional analytics preference in localStorage. Visitors can withdraw permission through the Privacy page.
- This repository does not contain or create a Google Analytics property. The property and Web Data Stream must be controlled by the site owner.
