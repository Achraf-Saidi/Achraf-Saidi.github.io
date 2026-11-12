-- Secret answer banks are in Postgres only, NOT committed to the public repository.
CREATE TABLE IF NOT EXISTS assessment_questions(
 id TEXT PRIMARY KEY CHECK(length(id) BETWEEN 3 AND 100),
 module_id TEXT NOT NULL CHECK(module_id ~ '^[A-M][0-9]{1,2}$'),
 kind TEXT NOT NULL CHECK(kind IN ('choice','number')),
 prompt_fr TEXT NOT NULL,
 prompt_en TEXT NOT NULL,
 options_fr JSONB,
 options_en JSONB,
 unit TEXT,
 secret_answer JSONB NOT NULL,
 explanation_fr TEXT NOT NULL,
 explanation_en TEXT NOT NULL,
 difficulty INTEGER NOT NULL CHECK(difficulty BETWEEN 1 AND 5),
 approved BOOLEAN NOT NULL DEFAULT FALSE,
 active BOOLEAN NOT NULL DEFAULT FALSE,
 reviewer_id TEXT,
 reviewed_at TIMESTAMPTZ,
 content_version INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK (NOT approved OR (reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_module ON assessment_questions(module_id,approved,active);
REVOKE ALL ON assessment_questions FROM PUBLIC;
-- Create a dedicated least-privilege application DB role that may SELECT
-- approved rows for tests; never expose direct DB access to browser clients.
-- Remove write rights on question banks from the API DB role for production.
CREATE TABLE IF NOT EXISTS capstone_reviews(
 user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 track_id TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','rejected','approved')),
 evidence_verified BOOLEAN NOT NULL DEFAULT FALSE,
 reviewed_by TEXT,
 rubric JSONB NOT NULL DEFAULT '{}'::jsonb,
 reviewed_at TIMESTAMPTZ,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,track_id),
 CHECK(status!='approved' OR (evidence_verified=TRUE AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
COMMENT ON TABLE capstone_reviews IS
 'Real academic capstones need a named reviewer and graded rubric before an unaccredited certificate is issued.';
