-- V3.4.2: keyed non-reversible pseudonymous IP for statistical dedup ONLY.
-- This DOES NOT deny repeat WhatsApp visits; no raw IP addresses stored.
-- Run on production D1 angel-research-links-v33 before enabling the feature.
CREATE TABLE IF NOT EXISTS analytics_ip_dedup (
  metric TEXT NOT NULL CHECK(metric IN ('page_view','join_click')),
  ip_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  first_seen_at INTEGER NOT NULL,
  seen_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(metric, ip_hash)
);
CREATE INDEX IF NOT EXISTS analytics_ip_dedup_expiry ON analytics_ip_dedup(expires_at);
