-- Apply AFTER 001 and 002 and Better Auth migrations. PostgreSQL 15+.
-- No test answers are sent to clients before an attempt has been submitted.
CREATE TABLE IF NOT EXISTS learning_events(
 user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 module_id TEXT NOT NULL CHECK(module_id ~ '^[A-M][0-9]{1,2}$'),
 self_reported_completed BOOLEAN NOT NULL DEFAULT FALSE,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,module_id)
);
CREATE TABLE IF NOT EXISTS assessment_attempts(
 id UUID PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 exam_id TEXT NOT NULL,
 locale TEXT NOT NULL CHECK(locale IN ('fr','en')),
 public_questions JSONB NOT NULL,
 answer_key JSONB NOT NULL,
 started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 expires_at TIMESTAMPTZ NOT NULL,
 submitted_at TIMESTAMPTZ,
 state TEXT NOT NULL DEFAULT 'started' CHECK(state IN ('started','passed','failed','expired')),
 score INTEGER CHECK(score BETWEEN 0 AND 100),
 responses JSONB,
 correct_count INTEGER,
 item_count INTEGER NOT NULL CHECK(item_count BETWEEN 1 AND 100)
);
CREATE INDEX IF NOT EXISTS idx_assessment_user_exam ON assessment_attempts(user_id,exam_id,started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_open_assessment
 ON assessment_attempts(user_id,exam_id) WHERE state='started';
CREATE TABLE IF NOT EXISTS assessment_passes(
 user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 exam_id TEXT NOT NULL,
 best_score INTEGER NOT NULL CHECK(best_score BETWEEN 0 AND 100),
 passed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,exam_id)
);
CREATE TABLE IF NOT EXISTS academy_certificates(
 public_id UUID PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 track_id TEXT NOT NULL,
 recipient_display_name TEXT NOT NULL CHECK(length(recipient_display_name) BETWEEN 2 AND 100),
 assessment_score INTEGER NOT NULL CHECK(assessment_score BETWEEN 0 AND 100),
 issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 revoked_at TIMESTAMPTZ,
 publicly_verifiable BOOLEAN NOT NULL DEFAULT FALSE,
 UNIQUE(user_id,track_id)
);
CREATE INDEX IF NOT EXISTS idx_certificate_user ON academy_certificates(user_id);
COMMENT ON TABLE academy_certificates IS
 'Private unaccredited self-paced achievement certificates; public verification only by explicit opt-in.';
