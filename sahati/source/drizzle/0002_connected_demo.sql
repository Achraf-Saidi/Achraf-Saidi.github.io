CREATE TABLE IF NOT EXISTS sahati_record_versions (
 record_id TEXT NOT NULL,
 version INTEGER NOT NULL,
 data TEXT NOT NULL,
 actor_id TEXT NOT NULL,
 reason TEXT NOT NULL,
 created_at TEXT NOT NULL,
 PRIMARY KEY(record_id,version)
);
CREATE TABLE IF NOT EXISTS sahati_learning_attempts (
 id TEXT PRIMARY KEY NOT NULL,
 account_id TEXT NOT NULL,
 case_id TEXT NOT NULL,
 result TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS learning_account ON sahati_learning_attempts(account_id,created_at);
