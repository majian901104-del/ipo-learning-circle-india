# IPO Desk lead capture deployment

1. Open https://script.google.com and create a new project.
2. Paste the contents of `apps-script.gs` into Code.gs and save.
3. Deploy > New deployment > Web app.
4. Execute as: **Me**.
5. Who has access: **Anyone**.
6. Deploy and copy the `https://script.google.com/macros/s/.../exec` URL.
7. Replace `__APPS_SCRIPT_WEB_APP_URL__` in `apply.html` with that URL.
8. After testing one submission in the Google Sheet, change all public community CTA links to `apply.html`.

Data destination: Google Sheet **IPO Desk Leads**, tab **Leads**.
