CREATE TABLE IF NOT EXISTS payment_attempts (
 id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organisations(id), invoice_id TEXT NOT NULL REFERENCES invoices(id),
 requester_id TEXT NOT NULL REFERENCES users(id), mode TEXT NOT NULL CHECK(mode IN ('test','live')),
 amount_cents INTEGER NOT NULL CHECK(amount_cents>=2), method TEXT NOT NULL DEFAULT '',
 idempotency_key TEXT NOT NULL UNIQUE, provider_id TEXT UNIQUE, checkout_url TEXT,
 status TEXT NOT NULL DEFAULT 'creating', lease_until TEXT, error TEXT NOT NULL DEFAULT '',
 payload TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_active_invoice ON payment_attempts(invoice_id,mode)
 WHERE status IN ('creating','uncertain','open','pending','authorized','anomaly');
CREATE TABLE IF NOT EXISTS provider_receipts (
 id TEXT PRIMARY KEY, attempt_id TEXT NOT NULL UNIQUE REFERENCES payment_attempts(id), invoice_id TEXT NOT NULL REFERENCES invoices(id),
 provider_id TEXT NOT NULL UNIQUE, amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
 allocated_cents INTEGER NOT NULL CHECK(allocated_cents>=0 AND allocated_cents<=amount_cents),
 excess_cents INTEGER NOT NULL CHECK(excess_cents>=0), paid_at TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS payment_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT, attempt_id TEXT NOT NULL REFERENCES payment_attempts(id),
 status TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS refund_attempts (
 id TEXT PRIMARY KEY, attempt_id TEXT NOT NULL REFERENCES payment_attempts(id), requester_id TEXT NOT NULL REFERENCES users(id),
 amount_cents INTEGER NOT NULL CHECK(amount_cents>0), reason TEXT NOT NULL,
 idempotency_key TEXT NOT NULL UNIQUE, provider_id TEXT UNIQUE, status TEXT NOT NULL DEFAULT 'creating',
 error TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS payment_recent ON payment_attempts(status,updated_at);
CREATE TRIGGER IF NOT EXISTS receipt_no_update BEFORE UPDATE ON provider_receipts BEGIN SELECT RAISE(ABORT,'immutable provider receipt'); END;
CREATE TRIGGER IF NOT EXISTS receipt_no_delete BEFORE DELETE ON provider_receipts BEGIN SELECT RAISE(ABORT,'immutable provider receipt'); END;
CREATE TRIGGER IF NOT EXISTS payment_event_no_update BEFORE UPDATE ON payment_events BEGIN SELECT RAISE(ABORT,'append-only payment events'); END;
CREATE TRIGGER IF NOT EXISTS payment_event_no_delete BEFORE DELETE ON payment_events BEGIN SELECT RAISE(ABORT,'append-only payment events'); END;
