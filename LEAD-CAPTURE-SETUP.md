# IPO Desk lead capture — hardened deployment

The public website is already connected to Google Apps Script. After changing backend code, update the existing Apps Script deployment so the current /exec URL stays the same.

1. Open the existing Apps Script project.
2. Replace Code.gs with the current contents of `apps-script.gs`.
3. Save.
4. Deploy > Manage deployments.
5. Edit the existing Web app deployment.
6. Create a new version and deploy it.
7. Keep:
   - Execute as: Me
   - Who has access: Anyone
8. Test one valid lead from `apply.html` and confirm one new row in **IPO Desk Leads / Leads**.

The hardened backend adds server-side input validation, spreadsheet-formula sanitization, a honeypot, a lightweight form key, and five-minute duplicate suppression by WhatsApp number.
