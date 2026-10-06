const SHEET_ID = '1qJptOdydgmodsWNit6KhV__YxgybpxuG6TJ0RkbNQrA';
const SHEET_NAME = 'Leads';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const p = e.parameter || {};
    sheet.appendRow([
      new Date(),
      p.full_name || '',
      p.age_range || '',
      p.whatsapp || '',
      p.email || '',
      p.city_state || '',
      p.investor_type || '',
      p.ipo_interest || '',
      p.consent || '',
      p.source_page || '',
      p.utm_source || '',
      p.utm_campaign || '',
      'New',
      ''
    ]);
    return ContentService.createTextOutput(JSON.stringify({ok:true}))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput('IPO Desk lead endpoint is active.');
}