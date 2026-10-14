-- V3.4.1: keyed HMAC digest of Cloudflare edge IP, never raw IP.
-- Execute against production D1 angel-research-links-v33 BEFORE enabling the guard.
-- After expiry, the row can be overwritten by the next valid request.
CREATE TABLE IF NOT EXISTS link_ip_limits (
  ip_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  blocked_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS link_ip_limits_expiry_idx ON link_ip_limits(expires_at);
