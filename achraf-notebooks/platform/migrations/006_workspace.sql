-- After 001..005 and Better Auth schema. Durable learner workspace and editorial studio.
CREATE TABLE IF NOT EXISTS learner_profiles (
 user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 preferences JSONB NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS learner_notes (
 user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 module_id TEXT NOT NULL,
 body TEXT NOT NULL CHECK(length(body)<=12000),
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,module_id)
);
CREATE TABLE IF NOT EXISTS learning_reviews (
 user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 module_id TEXT NOT NULL,
 due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 interval_days INTEGER NOT NULL DEFAULT 1,
 repetitions INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(user_id,module_id)
);
CREATE TABLE IF NOT EXISTS learning_sessions (
 id UUID PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 module_id TEXT NOT NULL,
 minutes INTEGER NOT NULL CHECK(minutes BETWEEN 1 AND 240),
 studied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS learning_sessions_user ON learning_sessions(user_id,studied_at DESC);
CREATE TABLE IF NOT EXISTS notebook_lessons (
 id UUID PRIMARY KEY,
 module_id TEXT NOT NULL,
 title TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('draft','published')),
 blocks JSONB NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 updated_by TEXT NOT NULL REFERENCES "user"(id),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notebook_assets (
 id UUID PRIMARY KEY,
 filename TEXT NOT NULL,
 mime TEXT NOT NULL,
 bytes BYTEA NOT NULL CHECK(octet_length(bytes)<=8388608),
 created_by TEXT NOT NULL REFERENCES "user"(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notebook_trainings (
 id UUID PRIMARY KEY,
 definition JSONB NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notebook_settings (
 key TEXT PRIMARY KEY,
 value JSONB NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS notebook_audit (
 id UUID PRIMARY KEY,
 actor_id TEXT NOT NULL REFERENCES "user"(id),
 action TEXT NOT NULL,
 target_id TEXT NOT NULL,
 detail JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notebook_revisions (
 lesson_id UUID NOT NULL REFERENCES notebook_lessons(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL,
 snapshot JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(lesson_id,revision)
);
