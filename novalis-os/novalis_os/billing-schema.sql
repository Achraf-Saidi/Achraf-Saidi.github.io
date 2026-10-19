CREATE TABLE IF NOT EXISTS billing_settings (org_id TEXT PRIMARY KEY REFERENCES organisations(id), payload TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS billing_documents (
 invoice_id TEXT PRIMARY KEY REFERENCES invoices(id), org_id TEXT NOT NULL REFERENCES organisations(id),
 test_mode INTEGER NOT NULL DEFAULT 0 CHECK(test_mode IN (0,1)), title TEXT NOT NULL,
 recipient_type TEXT NOT NULL CHECK(recipient_type IN ('belgian_business','consumer','international')),
 snapshot TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
 issued_at TEXT, published_at TEXT, canceled_at TEXT, peppol_status TEXT NOT NULL DEFAULT 'not_connected',
 request_count INTEGER NOT NULL DEFAULT 0, last_requested_at TEXT
);
CREATE TABLE IF NOT EXISTS billing_sequences (org_id TEXT NOT NULL,year INTEGER NOT NULL,test_mode INTEGER NOT NULL,number INTEGER NOT NULL,PRIMARY KEY(org_id,year,test_mode));
CREATE TABLE IF NOT EXISTS billing_test_clients (client_id TEXT PRIMARY KEY REFERENCES clients(id));
CREATE TABLE IF NOT EXISTS billing_test_receipts (
 id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL REFERENCES billing_documents(invoice_id), amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
 method TEXT NOT NULL, reference TEXT NOT NULL, paid_at TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS billing_transfer_notices (
 id TEXT PRIMARY KEY,invoice_id TEXT NOT NULL REFERENCES invoices(id),user_id TEXT NOT NULL REFERENCES users(id),
 reference TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(invoice_id,user_id)
);
CREATE TRIGGER IF NOT EXISTS billing_document_frozen BEFORE UPDATE ON billing_documents
 WHEN OLD.issued_at IS NOT NULL AND (NEW.snapshot IS NOT OLD.snapshot OR NEW.title IS NOT OLD.title OR NEW.test_mode!=OLD.test_mode OR NEW.recipient_type!=OLD.recipient_type)
 BEGIN SELECT RAISE(ABORT,'issued billing document is immutable'); END;
CREATE TRIGGER IF NOT EXISTS billing_test_receipt_no_update BEFORE UPDATE ON billing_test_receipts BEGIN SELECT RAISE(ABORT,'immutable test receipt'); END;
CREATE TRIGGER IF NOT EXISTS billing_test_receipt_no_delete BEFORE DELETE ON billing_test_receipts BEGIN SELECT RAISE(ABORT,'immutable test receipt'); END;
