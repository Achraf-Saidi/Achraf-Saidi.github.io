-- Project parties beyond the core user accounts; scoped by project and organisation.
CREATE TABLE IF NOT EXISTS project_stakeholders (
 id TEXT PRIMARY KEY,
 project_id TEXT NOT NULL REFERENCES projects(id),
 name TEXT NOT NULL,
 organisation TEXT NOT NULL DEFAULT '',
 email TEXT NOT NULL DEFAULT '',
 responsibility TEXT NOT NULL,
 category TEXT NOT NULL CHECK(category IN ('sponsor','decision','delivery','consulted','informed')),
 visibility TEXT NOT NULL CHECK(visibility IN ('internal','shared')),
 status TEXT NOT NULL CHECK(status IN ('active','pending','inactive')),
 version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS stakeholders_project ON project_stakeholders(project_id,visibility,category);
