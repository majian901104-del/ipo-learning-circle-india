const SHEET_ID = '1qJptOdydgmodsWNit6KhV__YxgybpxuG6TJ0RkbNQrA';
const SHEET_NAME = 'Leads';
const FORM_KEY = 'ipo-desk-v1';

function clean_(value, maxLen) {
  let s = String(value || '').trim().slice(0, maxLen || 200);
  // Prevent spreadsheet-formula injection while preserving visible text.
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const p = (e && e.parameter) ? e.parameter : {};

  // Honeypot + lightweight form-key check.
  if (p.website) return json_({ ok: true });
  if (p.form_key !== FORM_KEY) return json_({ ok: false, error: 'invalid_form' });

  const fullName = clean_(p.full_name, 80);
  const age = clean_(p.age_range, 20);
  const rawPhone = String(p.whatsapp || '').trim();
  const phoneDigits = rawPhone.replace(/\D/g, '');
  const email = clean_(p.email, 120);
  const city = clean_(p.city_state, 80);
  const investorType = clean_(p.investor_type, 40);
  const interest = clean_(p.ipo_interest, 40);
  const consent = p.consent === 'Yes' ? 'Yes' : '';

  const allowedAges = ['25–34', '35–44', '45–54', '55+'];
  if (fullName.length < 2 || !allowedAges.includes(age) ||
      phoneDigits.length < 7 || phoneDigits.length > 15 || consent !== 'Yes') {
    return json_({ ok: false, error: 'invalid_input' });
  }

  // Block rapid repeat submissions from the same phone for 5 minutes.
  const cache = CacheService.getScriptCache();
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, phoneDigits);
  const cacheKey = 'lead_' + Utilities.base64EncodeWebSafe(digest).slice(0, 36);
  if (cache.get(cacheKey)) return json_({ ok: true, duplicate: true });
  cache.put(cacheKey, '1', 300);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) return json_({ ok: false, error: 'sheet_missing' });

    sheet.appendRow([
      new Date(),
      fullName,
      age,
      clean_(rawPhone, 20),
      email,
      city,
      investorType,
      interest,
      consent,
      clean_(p.source_page, 80),
      clean_(p.utm_source, 80),
      clean_(p.utm_campaign, 120),
      'New',
      ''
    ]);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput('IPO Desk lead endpoint is active.');
}
