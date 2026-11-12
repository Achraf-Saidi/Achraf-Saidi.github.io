-- Apply after Better Auth's own schema migrations.
CREATE TABLE IF NOT EXISTS billing_customers (
 user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 stripe_customer_id TEXT NOT NULL UNIQUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS checkout_sessions (
 session_id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 product_key TEXT NOT NULL CHECK(product_key IN ('foundations','pro_monthly')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_user ON checkout_sessions(user_id);
CREATE TABLE IF NOT EXISTS billing_events (
 id TEXT PRIMARY KEY,
 type TEXT NOT NULL,
 received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS entitlements (
 user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 product_key TEXT NOT NULL CHECK(product_key IN ('foundations','pro_monthly')),
 source_id TEXT NOT NULL,
 is_active BOOLEAN NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(user_id,product_key,source_id)
);
CREATE INDEX IF NOT EXISTS idx_entitlements_user ON entitlements(user_id,is_active);
