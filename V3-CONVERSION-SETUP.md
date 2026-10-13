# Angel Research — V3.1 Conversion Measurement (13 Oct 2026)

## Deployment truth
- **LIVE on GitHub Pages:** GA4 tracking (visitor consent), the inactive conversion frontend, the attribution link builder (`promotion-kit.html`), and 41-page code injection.
- **NOT DEPLOYED:** Cloudflare Worker conversion backend. No independent visit/click metrics exist until Cloudflare is configured and this Worker is deployed.
- **SAFE DEFAULT:** `conversion-config.js` contains `enabled:false` and an empty Worker base; all WhatsApp links continue going DIRECTLY to `https://cc.stockscode.click`.
- **NEVER COLLECTED by the Worker dataset:** IP addresses, personal identifiers, names, phone numbers, email addresses, full URLs, visitor cookies, browser/device fingerprints or session identifiers.
- The Worker records aggregate-only page-view and redirect-request counters by campaign, source, medium, page path and coarse country. It does NOT validate actual WhatsApp group membership and cannot guarantee complete bot-free reporting.
- The website does not require an optional Google Analytics acceptance to open the community link.
- If the visitor explicitly rejects optional site analytics or signals Global Privacy Control / Do Not Track, the site does not send its optional independent conversion requests.

## Activate the independent layer

1. Sign in to a **Cloudflare account that you control** (or create one at https://dash.cloudflare.com/). GitHub authorization alone cannot deploy a Cloudflare Worker.
2. Open your already-connected GitHub project at `majian901104-del/ipo-learning-circle-india`.
3. Deploy the independent Worker from the repo directory `conversion-worker`, using Wrangler from a trusted local machine:

```bash
cd conversion-worker
npx wrangler login
npx wrangler deploy
```

   The config in `conversion-worker/wrangler.toml` defines an Analytics Engine dataset `angel_research_conversion_v31` and a destination URL restricted in code to `https://cc.stockscode.click`. On successful deploy, Wrangler prints the Worker HTTPS URL. **Never paste API tokens into source files or ChatGPT.**
4. Visit `https://YOUR-WORKER-URL/health` in the browser. You should receive JSON with `"status":"ok"` and `"aggregate":true`. No personal information is collected by the health check.
5. Supply the **public Worker URL only** for the frontend connection. In `conversion-config.js`, set `enabled: true` and `workerBase: 'https://YOUR-VERIFIED-WORKER-URL'`. Publish to main; the GitHub Pages workflow will redeploy automatically.
6. With the site analytics preference not explicitly denied, open the landing page with a test UTM campaign, click the green community CTA and confirm that you arrive at the intended WhatsApp community. Verify both `page_view` and `join_click` data after a short delay.
7. Use the private Cloudflare Analytics Engine SQL API to inspect aggregated counts. Keep the **Cloudflare account ID / private read token server-side** and never embed them in a website page or public GitHub code.

## Example private aggregate queries

Using Cloudflare's Analytics Engine SQL API:

```sql
SELECT blob3 AS campaign,
       blob4 AS traffic_source,
       blob1 AS event_type,
       SUM(_sample_interval) AS approximate_count
FROM angel_research_conversion_v31
WHERE timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY campaign, traffic_source, event_type
ORDER BY approximate_count DESC
LIMIT 100
```

The Worker writes:
- `blob1`: `page_view` or `join_click`
- `blob2`: route path
- `blob3`: campaign (sanitized short string)
- `blob4`: source (`x`, `youtube`, etc.)
- `blob5`: medium
- `blob6`: country code or `unknown`

Counts are approximate and may reflect bots, refreshes, duplicate taps or blocked requests; do not use them as guaranteed unique human visitors. Cloudflare's sampling / retention rules apply.

## Creator-specific promotion links

The link generator is published at:
https://angelresearchindia.com/promotion-kit.html

For Gurjot, for example:
https://angelresearchindia.com/ipo-community.html?utm_source=x&utm_medium=influencer&utm_campaign=gurjot_ipo

This URL is safe to put in an X paid partnership post with correct advertisement disclosure, subject to applicable financial promotion rules. Give each promoter a different `utm_campaign`.

## KPIs and limits

- **Post impressions:** Verified X creator analytics.
- **Website traffic:** Concented GA4 page views + independent anonymous page request aggregates. They are **not the same event population** and should NOT be added together.
- **CTA exits:** GA4 `join_community_click` if GA4 permitted; Worker `join_click` aggregate after deployment. These may differ.
- **Actual group joins:** Check WhatsApp group administrator membership records, and attribute them to a campaign only when reliable evidence exists (e.g. distinct approved invitation links).
- **Cost per confirmed join:** Paid creator fee / independently verified actual joins. If zero joins or unknown, display blank, not zero.
- **Privacy:** No bypassing explicit refusal, no cookies for the independent Worker and no person-level tracking. Laws differ by jurisdiction; confirm your notice and legal basis before switching on anonymous aggregation.
- **Worker reports are not automatically imported into GA4** or the marketing console. The console is a local calculator, not a live reporting backend.

## Testing and validation

The GitHub Pages deployment runs:

```bash
node --check ga4-analytics.js
node --check conversion-config.js
node --check conversion-tracker.js
node --check conversion-worker/src/index.mjs
node --test conversion-worker/test/conversion.test.mjs
node build-ga4.cjs
```

All six Worker unit tests must pass. They check whitelisted origins, no personal-data storage, fixed redirect destination, analytics opt-out, unknown events, and fallback behavior.

## Future improvement (optional)

Once Cloudflare works, build an authenticated owner-only reporting API with server-side credentials to populate the marketing console directly. Do not expose the raw Analytics Engine read token or login secrets to page visitors. Private membership reconciliation remains separate.
