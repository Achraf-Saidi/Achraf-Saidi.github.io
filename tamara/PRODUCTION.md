# Phase KVM — migration contract

The current deliverable is the GitHub Pages review phase. Do not route real orders to it. No KVM service was changed or deployed.

## Shared commerce API to implement

- Public catalog: only published products, sanitized descriptions and approved image URLs; server-computed availability.
- POST /orders: validate contact/address, carrier coverage, integer quantities, actual published variants, and current prices. Within a database transaction reserve stock, store immutable line totals and shipping quote, and return a cryptographically random reference and tracking secret. Add request idempotency keys.
- Tracking: reference + verified mobile/OTP recovery for lost links, rate-limited lookup, secure server session or high-entropy secret; never expose full order data from a short reference alone.
- Management: individual accounts, password hashing, secure HttpOnly sessions, CSRF protection, role checks and append-only event audit.
- Atomic stock reservation, shipment, cancellation, return and financial reconciliation. Real database row locks/transactions and unique operation keys.
- Image upload: enforce type, dimensions/size, re-encode server-side, store outside executable directories, keep originals and validated renditions with backups.
- Shipping: merchant-approved coverage, per-wilaya/commune rates, verified pickup agencies, courier integration only after receipt of actual credentials/docs.

## Edahabia/CIB

1. Merchant creates and verifies a supported payment-provider account; secrets belong to the server environment only.
2. Server calculates total from stored order lines and delivery; creates a sandbox checkout and persists its ID before redirecting the shopper.
3. HTTPS webhook validates the exact raw payload signature. In one DB transaction validate stored checkout ID, currency, amount and live/test environment; reject duplicate event IDs; update payment ledger once.
4. Reconcile against the provider API; expired/failed checkouts release or expire reservations through an explicit policy. Do not treat browser success as proof.
5. Test success, decline, timeout, duplicate webhook, altered payload, wrong total, replay, refund, reservation expiry and late payment.
6. Activate production credentials only once the merchant contract and staging acceptance are complete.

The included verifier is a starting primitive; the checkout endpoint, database, authentication, durable webhook ledger and reconciliation still need implementation.

## Hosting sequence after design approval

Dedicated container/service on the existing KVM, persistent database and image volume, isolated secrets, reverse proxy HTTPS, automated backups plus restore test, staging domain then approved production domain. Keep Novalis/DJEZZ services isolated. Validate mobile checkout and real carrier/payout procedures with Tamara before opening sales.

## Merchant inputs

Confirmed brand logo/colors; real article photos/prices/stock/size charts/composition; legal business information and contact details; exchange/return policy; courier coverage/rates/agencies; payment merchant credentials configured privately. The verified intended social link is https://www.instagram.com/tamara__trend/ .
