-- Run in Cloudflare D1 production angel-research-links-v33.
-- No customer data is collected before JOIN_LEAD_FORM_ENABLED is enabled.
CREATE TABLE IF NOT EXISTS community_leads (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 request_nonce TEXT NOT NULL UNIQUE,
 full_name TEXT NOT NULL,
 whatsapp_number TEXT NOT NULL,
 source TEXT NOT NULL DEFAULT 'direct',
 campaign TEXT NOT NULL DEFAULT 'direct',
 medium TEXT NOT NULL DEFAULT 'direct',
 updates_opt_in INTEGER NOT NULL DEFAULT 0 CHECK(updates_opt_in IN (0,1)),
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS community_leads_created_idx ON community_leads(created_at);
