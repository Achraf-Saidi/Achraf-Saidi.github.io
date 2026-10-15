CREATE TABLE IF NOT EXISTS lead_intake (
 lead_id TEXT PRIMARY KEY REFERENCES leads(id),
 reference TEXT NOT NULL UNIQUE,
 access_hash TEXT NOT NULL UNIQUE,
 request_key_hash TEXT NOT NULL UNIQUE,
 payload_hash TEXT NOT NULL,
 created_at TEXT NOT NULL,
 expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lead_public_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 lead_id TEXT NOT NULL REFERENCES leads(id),
 status TEXT NOT NULL CHECK(status IN ('received','reviewing','contact','proposal','project','closed')),
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS lead_public_events_lead ON lead_public_events(lead_id,id);
CREATE TABLE IF NOT EXISTS document_versions (
 document_id TEXT PRIMARY KEY REFERENCES documents(id),
 root_id TEXT NOT NULL REFERENCES documents(id),
 previous_id TEXT UNIQUE REFERENCES documents(id),
 number INTEGER NOT NULL CHECK(number>0),
 UNIQUE(root_id,number)
);
