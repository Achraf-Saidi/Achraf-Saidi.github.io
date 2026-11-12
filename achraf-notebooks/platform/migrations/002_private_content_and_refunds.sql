-- Apply after 001_billing.sql. Draft schema, not a production migration.
ALTER TABLE checkout_sessions ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;
CREATE INDEX IF NOT EXISTS idx_checkout_payment_intent
 ON checkout_sessions(payment_intent_id) WHERE payment_intent_id IS NOT NULL;
ALTER TABLE entitlements ADD COLUMN IF NOT EXISTS last_event_created BIGINT NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS private_lessons (
 slug TEXT PRIMARY KEY CHECK(slug ~ '^[a-z0-9-]{3,80}$'),
 title TEXT NOT NULL CHECK(length(title) BETWEEN 3 AND 200),
 body_markdown TEXT NOT NULL,
 required_product_key TEXT NOT NULL CHECK(required_product_key IN ('foundations','pro_monthly')),
 published BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Do not insert public teaching prose here as a "premium" asset: the public
-- corpus is openly licensed and should remain freely accessible.
