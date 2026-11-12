# Achraf Notebooks · private platform foundation

**Status: development scaffold. Do not deploy to paying customers yet.** The live academy on GitHub Pages is free; it cannot protect content or authorize purchases. This Node 22+/PostgreSQL server is a separate future VPS application. Nothing is enabled on the live domain.

## Architecture

- Identity: Better Auth with PostgreSQL sessions, email verification and verification emails. Its own migrations must be generated and applied before billing migrations.
- Payments: Stripe Checkout for a single foundations course or Pro monthly; price IDs come **only** from server environment, never from browser-provided amounts. Stripe-hosted Customer Portal handles recurring billing.
- Entitlements: database-based; never grant access after a browser redirect, and never trust a client-supplied user ID. Checkout events require Stripe raw-body signature and a matching server-created checkout record. Subscription events use a server-owned Stripe customer mapping. Idempotent event table and DB transactions allow safe retries.
- Content: private premium material must be stored outside GitHub Pages and served only after checking entitlements. No premium content delivery endpoint exists yet.
- Scope: Pro entitlement requires a Stripe subscription with the configured Pro price and active/trialing status. One-time access requires an actually paid Checkout Session.

## Setup (development only)

1. Create a separate PostgreSQL database and user with least privilege.
2. Set environment variables based on .env.example in the VPS secrets manager or private env file. Never put secrets in GitHub Pages, Astro PUBLIC_* variables, JavaScript bundles, or a public GitHub repo. Use Stripe test keys until the go-live audit.
3. Run `npm install` in this directory (lockfile should be committed after an install on a networked builder). Run Better Auth migrations with its supported CLI, then apply `migrations/001_billing.sql`.
4. `npm test` and `npm run check`. Start behind HTTPS reverse proxy; service binds only to 127.0.0.1. Configure provider webhooks for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted`.
5. Host frontend and API under the **same origin**, or design and test cross-origin CSRF/CORS separately. Billing mutations require exact Origin match.

## Mandatory before launching

- Build the frontend login/signup/reset UI and account pages, verify end-to-end cookie flow and email deliverability.
- Run real Stripe test-mode scenarios: card, asynchronous bank payment, failed/incomplete payment, webhook retry/out-of-order, cancel/renew/refund/dispute, subscription upgrades/downgrades, customer deletion. Add refund/dispute revocation: **not yet implemented**.
- Make a distinct private-content store and an authorized lesson delivery endpoint; test direct URL denial for non-entitled users. GitHub Pages static URLs are public forever.
- Add TLS/proxy hardening, CSP, WAF/rate limits including checkout, system monitoring, backups, restore rehearsals, GDPR deletion and retention, invoice/TVA legal review including digital-consumer withdrawal consent, support and incident response.
- Check Stripe Tax registrations/eligibility; `automatic_tax` does not solve VAT registrations or determine education exemptions.
- Install pinned resolved dependency lockfile after audit, scan dependencies, keep framework patched and verify Better Auth schema against the installed version.
- Consider Stripe event ordering: subscription price and status may change; reconcile from provider API regularly. No automated reconciliation job exists.
- **Do not advertise certification or accreditation.** Any course certificate is a private achievement document only after graded assessments are genuinely implemented.

## Current API (scaffold)

`GET /healthz`; Better Auth `/api/auth/*`; `POST /api/billing/checkout` with `{"productKey":"foundations"|"pro_monthly"}`; `POST /api/billing/portal`; `GET /api/me/entitlements`; signed `POST /api/billing/webhook`.

Pricing (79 EUR one-time and 19 EUR/mo) is a launch hypothesis. Create the actual Stripe prices first and perform legal/tax review.

## Sources

Stripe: https://docs.stripe.com/webhooks/signature
Better Auth: https://better-auth.com/docs/installation
OWASP: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

## Private lessons and revenue reversal rules (development)

The `private_lessons` PostgreSQL table contains **only new material stored privately**
(not open-licensed public GitHub Pages text). Only the server returns its Markdown,
through `GET /api/premium/lessons/:slug`, after authenticated session and DB-based
entitlement checks. `pro_monthly` unlocks both course levels; `foundations` never
unlocks Pro. The endpoint responds with `Cache-Control: no-store`; the future client
must sanitize Markdown and must never bundle premium chapters into public assets.

Run `migrations/002_private_content_and_refunds.sql` after migration 001.
Signed `charge.refunded` (full refund) and `charge.dispute.created` events revoke
matching one-time product rights when the Checkout payment-intent mapping is present.
Signed subscription events are timestamp-guarded against older updates. **This is
not sufficient for launch:** events may arrive out of order or before mapping, and
Stripe refunds/chargebacks may require manual review and scheduled reconciliation,
plus robust audit trail and recovery tests. A refund/dispute policy must be
legally reviewed before being applied to customers.

Better Auth now configures reset-password emails and server-side rate-limit storage.
Test these flows with a live transactional email sandbox before rollout.

## Same-origin UI prototype

The new responsive front end is served from `public/` at `/`, `/pricing`, `/account` and `/billing/success`. It supports registration, login, password-reset requests, session inspection, billing entitlement display, sign out and Stripe-hosted billing portal handoff. Text from server responses uses `textContent` rather than raw HTML. The UI purchase buttons intentionally do not initiate payment. Server checkout is **default disabled** unless `BILLING_ENABLED=true` is explicitly configured. A strict self-only Content Security Policy is applied to responses.

This is still an unaudited prototype: no paid lessons are seeded, and no production Stripe transactions should be accepted. Validate TLS, legal compliance, authentication behaviour and accessibility before enabling.

## Specializations, exam assessment and certificates (draft)

Seven progressive schools are described in `src/learning/catalog.mjs`, while **only the Statistical Inference & Bayes pilot** currently has implemented server-side assessment routes. Its four required module exams are D3, D6, D9 and D13, followed by the final `statistical-inference-final` (24 items). Module exams draw 10 questions in 35 minutes with an 80% pass mark. The final allows 70 minutes, requires 85% overall and at least 50% in each domain.

Questions, options, model answers and assessor rationales are held in private PostgreSQL table `assessment_questions`, not in the public repository, public Astro build, or downloadable client. Do not store a real bank in GitHub. Staff must independently review questions and mark them `approved=TRUE, active=TRUE` with attribution before an exam becomes available. A test may fail gracefully until sufficient approved questions (including numerical questions and upper-level items) exist. Do not seed an exposed demo answer bank and then call it secure.

Each account has limited attempts (3 starts per exam per rolling 24 hours), a one-active-attempt lock, deadline and server-side grading. Scores persist to `assessment_passes`; self-reported reading progress never counts as mastery. The final result does not automatically issue a credential: a named academic reviewer must additionally approve a capstone in `capstone_reviews` with evidence and a rubric. `POST /api/certificates/claim` requires explicit consent to show the recipient name on a public verification endpoint; the credential may subsequently be revoked. These are **independent unaccredited self-paced achievement certificates**, not university qualifications, identity-proctored examinations or a guarantee of competence.

Apply `migrations/003_learning.sql` then `004_private_question_bank.sql`. The new `/dashboard` UI needs a running private server; GitHub Pages cannot host authenticated exams. No data is present or charged at this stage. Before commercial release: security review, test of concurrency/deadlines/attempt limits with PostgreSQL, full question-bank writing and educational review, real capstone rubric, accessible UI and candidate identity policies. See the catalog and assessment unit tests.

## Pricing research and updated UX (12 November 2026)

See `docs/PRICING_AND_GROWTH_2026-11.md` for verified competitor prices, a VAT/Stripe margin sensitivity model, student segmentation, ethical acquisition and staged launch criteria. The refreshed homepage displays **proposed and disabled** Campus €4.90/month (€49/year) and Academy €9.90/month (€89/year), next to permanently free open lessons. **Legacy Stripe product identifiers do not correspond to these proposed offers** and must not be enabled or repurposed without new entitlements, migrations and a legal review. The new responsive design adds theme controls, mobile navigation, transparent annual-billing preview and a learning dashboard next-step/focus mode.
