# Tamara Trend — boutique & Tamara Studio

First independent review version, October 2026. Hosted at `/tamara/` in the existing GitHub Pages repository. This is a **functional browser-local demonstration**, not a live merchant platform and not a production ERP.

## Review

- Boutique: `https://achraf-saidi.github.io/tamara/`
- Management: `https://achraf-saidi.github.io/tamara/#/studio`
- Tracking: `https://achraf-saidi.github.io/tamara/#/suivi`

1. Open a product, select size/color and add it to the basket.
2. Checkout with fictional details, e.g. Lina Test, 0555000000 and a fictional address. Select home delivery or pickup point.
3. Save the reference or download the text receipt.
4. In Studio → Commandes, confirm, prepare, ship and deliver. Carrier and parcel references are manually editable.
5. Look up the order using its reference and the same mobile number. Closing/reopening the page retains tests in the same browser.
6. Record the COD collection separately after delivery; receiving a full return restores stock once, and a full refund is separate.
7. Studio → Articles: add/edit an article, upload up to five photos, edit composition/measurements/care, define size/color/SKU/stock, then publish it in the demo catalogue.
8. Export CSV or a JSON backup before deleting local tests.

## Brand evidence

The user supplied the official intended Instagram link: https://www.instagram.com/tamara__trend/ . Public retrieval was blocked on 16 October 2026. No location, company registration, product, price, stock, contact phone, materials, carrier contract or returns policy was inferred from inaccessible posts. The name, Algerian boutique context and Instagram destination come from the user. The editorial direction and four demonstration products are proposals; they are not representations of Tamara's actual inventory.

## Implemented

Responsive editorial homepage; collection filters/search/sorting; favorites; product details; variants and availability; persistent cart; checkout; normalized Algerian mobile validation; free-entry wilaya/commune/address and pickup details; delivery totals before confirmation; immutable order price snapshots; reference lookup; timestamped public status history; downloadable test receipt; management dashboard; per-variant physical/reserved/available stock; article editor and local photo uploads; order workflow; full returns/refunds; separate COD collections; customer aggregation; CSV and JSON export; delivery/returns settings; audit activity.

The wilaya input accepts free text and provides a legacy 58-name suggestion list, not a claim of exhaustive 2026 administrative coverage. Before live launch, import the selected carrier's current serviceable commune/agency catalogue and rates.

## Honest limitations

- LocalStorage only. No network order submission, shared database, cross-device lookup or production authentication. Studio is intentionally open for demo role switching. Do not enter real customer information.
- No actual online payments, SMS, email dispatch, tracking API, social feed, courier booking or accounting integration.
- Simultaneous browser-tab writes are not a transactional database. A storage event refreshes the other tab; this is not a multi-user inventory guarantee.
- Returns and refunds are whole-order only. No partial returns, exchanges, purchase ordering, supplier management, tax invoices or full accounting.
- Delivery rates are configurable example flat rates, not confirmed carrier tariffs. Carrier/pickup fields are manual.
- JSON backup export exists; automated restore/import is not implemented.
- French interface. Arabic/RTL production content remains to be implemented with the actual merchant copy.
- Studio metrics are demonstration management counters, not certified accounting.

## Payment preparation

`server/chargily.mjs` is a small **server-only, unit-tested primitive**, not a running API or connected payment flow. It validates the HMAC-SHA256 raw webhook body and binds a paid event to a stored checkout, amount and currency. It is not imported into the client. It intentionally does not enable a card-payment button or put merchant secrets in the frontend.

Official references checked 16 October 2026:
- https://chargily.com/dz/developer/pay?lang=fr
- https://chargily.com/dz/business/pay/help?lang=fr
- https://dev.chargily.com/pay-v2/webhooks

Online activation requires the merchant account, test keys, a backend with transactional checkout records, signed webhook handling and idempotency, and validated sandbox payment scenarios. Never accept a browser redirect as payment proof. See `PRODUCTION.md`.

## Validation

`npm install && npm test && npm run test:ui`

15 domain/payment tests cover stock caps, reservation release, immutable totals, stage order, shipment/return idempotency, COD/refund separation, SKU uniqueness, phone matching, archived articles and webhook signatures/mismatch rejection.

A JSDOM integration test covers collection, basket, checkout, escaped customer input, manager status change, client lookup, product creation, nine routes and persistence after reload. This is DOM validation, not a real-browser layout measurement.

No browser-control skill was available for this managed runtime, so visual responsive screenshots, measured overflow and real touch interaction remain unverified. Responsive CSS includes mobile navigation, two-column product cards, single-column checkout and horizontally scrollable management tables; actual mobile acceptance is still required.

## Assets

Two original generated editorial illustrations are bundled locally as `assets/editorial.webp` and `assets/collection.webp`, optimized for delivery. They depict fictional collections. Generated with the built-in image tool using a Mediterranean courtyard editorial brief and a four-look modest-fashion studio brief (ivory, chocolate, taupe and olive). No scraped Instagram product images or third-party fashion campaign assets are used. Instrument Serif and Manrope are bundled with their OFL licenses.
