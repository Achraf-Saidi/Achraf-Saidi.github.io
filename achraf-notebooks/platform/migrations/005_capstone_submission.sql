-- Version every project submission, so a reviewed project cannot be silently replaced.
CREATE TABLE IF NOT EXISTS capstone_submissions(
 user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 track_id TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1),
 project_url TEXT NOT NULL CHECK(length(project_url)<=500),
 report_summary TEXT NOT NULL CHECK(length(report_summary) BETWEEN 200 AND 7000),
 submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,track_id)
);
ALTER TABLE capstone_reviews ADD COLUMN IF NOT EXISTS submission_version INTEGER;
ALTER TABLE capstone_reviews ADD COLUMN IF NOT EXISTS score INTEGER CHECK(score BETWEEN 0 AND 100);
ALTER TABLE capstone_reviews ADD COLUMN IF NOT EXISTS reviewer_feedback TEXT;
ALTER TABLE academy_certificates ADD COLUMN IF NOT EXISTS capstone_score INTEGER CHECK(capstone_score BETWEEN 0 AND 100);
