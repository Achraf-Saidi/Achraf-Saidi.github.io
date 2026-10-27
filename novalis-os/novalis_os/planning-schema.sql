CREATE TABLE IF NOT EXISTS project_phases (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), milestone_id TEXT UNIQUE REFERENCES milestones(id),
 name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', acceptance TEXT NOT NULL DEFAULT '', starts_on TEXT NOT NULL,
 due_date TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK(price_cents>=0), vat_basis_points INTEGER NOT NULL DEFAULT 2100,
 position INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS phase_tasks (task_id TEXT PRIMARY KEY REFERENCES tasks(id), phase_id TEXT NOT NULL REFERENCES project_phases(id));
CREATE TABLE IF NOT EXISTS project_graph (
 project_id TEXT PRIMARY KEY REFERENCES projects(id), payload TEXT NOT NULL DEFAULT '{"positions":{},"edges":[],"notes":[]}',
 version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS project_specs (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), number INTEGER NOT NULL, version INTEGER NOT NULL DEFAULT 1,
 title TEXT NOT NULL, sections TEXT NOT NULL DEFAULT '{}', attachments TEXT NOT NULL DEFAULT '[]', snapshot TEXT NOT NULL DEFAULT '{}',
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','shared','accepted','declined','superseded')),
 created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, shared_at TEXT,
 manager_by TEXT REFERENCES users(id), manager_at TEXT, manager_name TEXT NOT NULL DEFAULT '', client_by TEXT REFERENCES users(id), client_at TEXT, client_name TEXT NOT NULL DEFAULT '',
 UNIQUE(project_id,number)
);
CREATE TABLE IF NOT EXISTS spec_comments (
 id TEXT PRIMARY KEY, spec_id TEXT NOT NULL REFERENCES project_specs(id), author_id TEXT NOT NULL REFERENCES users(id),
 section TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS phase_invoices (
 invoice_id TEXT PRIMARY KEY REFERENCES invoices(id), phase_id TEXT NOT NULL REFERENCES project_phases(id),
 spec_id TEXT NOT NULL REFERENCES project_specs(id), amount_cents INTEGER NOT NULL CHECK(amount_cents>0), created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS calendar_events (
 id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organisations(id), project_id TEXT REFERENCES projects(id),
 title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
 location TEXT NOT NULL DEFAULT '', meeting_url TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL DEFAULT 'meeting',
 visibility TEXT NOT NULL DEFAULT 'team' CHECK(visibility IN ('team','shared','private')),
 status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled')),
 creator_id TEXT NOT NULL REFERENCES users(id), series_id TEXT, version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL,
 CHECK(ends_at>starts_at)
);
CREATE TABLE IF NOT EXISTS calendar_attendees (
 event_id TEXT NOT NULL REFERENCES calendar_events(id), user_id TEXT NOT NULL REFERENCES users(id),
 response TEXT NOT NULL DEFAULT 'pending' CHECK(response IN ('pending','accepted','declined','tentative')),
 PRIMARY KEY(event_id,user_id)
);
CREATE INDEX IF NOT EXISTS calendar_range ON calendar_events(org_id,starts_at,ends_at);
CREATE INDEX IF NOT EXISTS phase_project ON project_phases(project_id,position);
CREATE INDEX IF NOT EXISTS specs_project ON project_specs(project_id,number);

-- A retried phase-invoice request returns the same draft, never a second deposit.
CREATE TABLE IF NOT EXISTS phase_invoice_requests (
 org_id TEXT NOT NULL REFERENCES organisations(id),
 request_id TEXT NOT NULL,
 invoice_id TEXT NOT NULL REFERENCES invoices(id),
 fingerprint TEXT NOT NULL,
 PRIMARY KEY(org_id,request_id)
);
