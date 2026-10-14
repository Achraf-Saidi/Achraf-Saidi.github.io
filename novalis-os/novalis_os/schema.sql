CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS organisations (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS clients (
 id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organisations(id), name TEXT NOT NULL,
 email TEXT NOT NULL, company_number TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organisations(id), client_id TEXT REFERENCES clients(id),
 name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 role TEXT NOT NULL CHECK(role IN ('manager','account','developer','client','finance','sysadmin')),
 status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','active','suspended')),
 password_hash TEXT, verified_at TEXT, totp_cipher TEXT, totp_pending TEXT, totp_counter INTEGER NOT NULL DEFAULT -1,
 created_at TEXT NOT NULL, CHECK((role='client' AND client_id IS NOT NULL) OR (role!='client' AND client_id IS NULL))
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf_hash TEXT NOT NULL,
 limited INTEGER NOT NULL DEFAULT 0, expires_at TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tokens (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), purpose TEXT NOT NULL,
 expires_at TEXT NOT NULL, consumed_at TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS recovery_codes (code_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS rate_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, resets_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS leads (
 id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organisations(id), owner_id TEXT REFERENCES users(id),
 name TEXT NOT NULL, email TEXT NOT NULL, company TEXT NOT NULL DEFAULT '', category TEXT NOT NULL,
 description TEXT NOT NULL, budget TEXT NOT NULL DEFAULT '', horizon TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','qualified','discovery','scoping','proposal','negotiation','won','lost')),
 scoping_note TEXT NOT NULL DEFAULT '', loss_reason TEXT NOT NULL DEFAULT '',
 version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS slots (
 id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organisations(id), owner_id TEXT NOT NULL REFERENCES users(id),
 starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
 UNIQUE(owner_id,starts_at), CHECK(ends_at>starts_at)
);
CREATE TABLE IF NOT EXISTS meetings (
 id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organisations(id), lead_id TEXT REFERENCES leads(id),
 slot_id TEXT NOT NULL REFERENCES slots(id), status TEXT NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','cancelled','completed')),
 cancel_hash TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS meeting_slot_reserved ON meetings(slot_id) WHERE status='reserved';
CREATE TABLE IF NOT EXISTS projects (
 id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organisations(id), client_id TEXT NOT NULL REFERENCES clients(id),
 lead_id TEXT UNIQUE REFERENCES leads(id), account_id TEXT NOT NULL REFERENCES users(id),
 name TEXT NOT NULL, scope TEXT NOT NULL, budget_cents INTEGER NOT NULL DEFAULT 0 CHECK(budget_cents>=0),
 due_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','awaiting_client','delivered','maintenance','archived')),
 version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS project_members (
 project_id TEXT NOT NULL REFERENCES projects(id), user_id TEXT NOT NULL REFERENCES users(id),
 PRIMARY KEY(project_id,user_id)
);
CREATE TABLE IF NOT EXISTS milestones (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), name TEXT NOT NULL, due_date TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','awaiting_client','approved','rejected')),
 version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS tasks (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), milestone_id TEXT REFERENCES milestones(id),
 assignee_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, description TEXT NOT NULL,
 estimate_minutes INTEGER NOT NULL CHECK(estimate_minutes>0), remaining_minutes INTEGER NOT NULL CHECK(remaining_minutes>=0),
 due_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','blocked','review','approved')),
 priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high')),
 client_visible INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS time_entries (
 id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id), user_id TEXT NOT NULL REFERENCES users(id),
 work_date TEXT NOT NULL, minutes INTEGER NOT NULL CHECK(minutes>0 AND minutes<=1440),
 billable INTEGER NOT NULL, note TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected')),
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), author_id TEXT NOT NULL REFERENCES users(id),
 channel TEXT NOT NULL CHECK(channel IN ('internal','external')), body TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS requests (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), author_id TEXT NOT NULL REFERENCES users(id),
 title TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received','analysing','planned','resolved','declined')),
 task_id TEXT REFERENCES tasks(id), version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), uploader_id TEXT NOT NULL REFERENCES users(id),
 channel TEXT NOT NULL CHECK(channel IN ('internal','external')), filename TEXT NOT NULL, mime TEXT NOT NULL,
 size INTEGER NOT NULL, sha256 TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS proposals (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), version INTEGER NOT NULL,
 title TEXT NOT NULL, scope TEXT NOT NULL, assumptions TEXT NOT NULL, exclusions TEXT NOT NULL,
 amount_cents INTEGER NOT NULL CHECK(amount_cents>=0), status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','shared','accepted','declined')),
 accepted_by TEXT REFERENCES users(id), accepted_at TEXT, created_at TEXT NOT NULL, UNIQUE(project_id,version)
);
CREATE TABLE IF NOT EXISTS invoices (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), external_number TEXT UNIQUE,
 due_date TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'EUR' CHECK(currency='EUR'),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','registered','paid')),
 peppol_reference TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS invoice_lines (
 id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL REFERENCES invoices(id), description TEXT NOT NULL,
 quantity INTEGER NOT NULL CHECK(quantity>0), unit_cents INTEGER NOT NULL CHECK(unit_cents>=0),
 vat_basis_points INTEGER NOT NULL CHECK(vat_basis_points>=0 AND vat_basis_points<=10000)
);
CREATE TABLE IF NOT EXISTS payments (
 id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL REFERENCES invoices(id), amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
 bank_reference TEXT NOT NULL, confirmed_by TEXT NOT NULL REFERENCES users(id), paid_at TEXT NOT NULL,
 idempotency_key TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS expenses (
 id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organisations(id), project_id TEXT REFERENCES projects(id),
 description TEXT NOT NULL, amount_cents INTEGER NOT NULL CHECK(amount_cents>=0), spent_at TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL, entity_id TEXT NOT NULL,
 title TEXT NOT NULL, seen INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
 UNIQUE(user_id,kind,entity_id)
);
CREATE TABLE IF NOT EXISTS outbox (
 id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organisations(id), recipient TEXT NOT NULL, subject TEXT NOT NULL, body_cipher TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sending','sent','failed')),
 attempts INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, sent_at TEXT, last_error TEXT NOT NULL DEFAULT '', lease_at TEXT
);
CREATE TABLE IF NOT EXISTS audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT, org_id TEXT NOT NULL REFERENCES organisations(id), actor_id TEXT REFERENCES users(id),
 action TEXT NOT NULL, entity_id TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'append-only audit'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'append-only audit'); END;
CREATE TRIGGER IF NOT EXISTS invoice_no_rewrite BEFORE UPDATE ON invoices WHEN OLD.status!='draft' AND
 (NEW.external_number IS NOT OLD.external_number OR NEW.due_date IS NOT OLD.due_date OR NEW.peppol_reference IS NOT OLD.peppol_reference)
 BEGIN SELECT RAISE(ABORT,'registered invoice is immutable'); END;
CREATE TRIGGER IF NOT EXISTS line_no_update BEFORE UPDATE ON invoice_lines WHEN
 (SELECT status FROM invoices WHERE id=OLD.invoice_id)!='draft' BEGIN SELECT RAISE(ABORT,'registered invoice is immutable'); END;
CREATE TRIGGER IF NOT EXISTS line_no_delete BEFORE DELETE ON invoice_lines WHEN
 (SELECT status FROM invoices WHERE id=OLD.invoice_id)!='draft' BEGIN SELECT RAISE(ABORT,'registered invoice is immutable'); END;
CREATE TRIGGER IF NOT EXISTS line_no_insert BEFORE INSERT ON invoice_lines WHEN
 (SELECT status FROM invoices WHERE id=NEW.invoice_id)!='draft' BEGIN SELECT RAISE(ABORT,'registered invoice is immutable'); END;
CREATE INDEX IF NOT EXISTS tasks_project ON tasks(project_id,status);
CREATE INDEX IF NOT EXISTS messages_project ON messages(project_id,channel,created_at);
CREATE INDEX IF NOT EXISTS users_org ON users(org_id,role);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id,seen);
