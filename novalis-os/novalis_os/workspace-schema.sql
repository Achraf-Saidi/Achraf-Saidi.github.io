CREATE TABLE IF NOT EXISTS user_profiles (
 user_id TEXT PRIMARY KEY REFERENCES users(id), job_title TEXT NOT NULL DEFAULT '',
 engagement TEXT NOT NULL DEFAULT 'employee' CHECK(engagement IN ('employee','independent','partner','client')),
 updated_at TEXT NOT NULL
);
