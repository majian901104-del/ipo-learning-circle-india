CREATE TABLE IF NOT EXISTS link_state(id INTEGER PRIMARY KEY CHECK(id=1),active_url TEXT,standby_url TEXT,version INTEGER NOT NULL DEFAULT 0,changed_at TEXT);
INSERT OR IGNORE INTO link_state(id,active_url,standby_url,version) VALUES(1,NULL,NULL,0);
CREATE TABLE IF NOT EXISTS link_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,action TEXT NOT NULL,old_url TEXT,new_url TEXT,at TEXT NOT NULL,event_version INTEGER UNIQUE);
CREATE TABLE IF NOT EXISTS link_grants(token_hash TEXT PRIMARY KEY,source TEXT NOT NULL,campaign TEXT NOT NULL,expires_at INTEGER NOT NULL,used_at INTEGER);
CREATE INDEX IF NOT EXISTS link_grants_expiry_idx ON link_grants(expires_at);
