# DJEZZ — La mode, bien gérée.

A private interactive fashion ERP and storefront presentation, created by Achraf Saidi. Hosted entirely in this GitHub Pages repository, under `/djezz/`. No ChatGPT authentication, SaaS hosting provider, external runtime dependency, or server API is used.

## Current edition

- Marketing site, configurable indicative plans (Essentiel 2,900 DZD, Atelier 5,900 DZD, Maison 11,900 DZD per month).
- SaaS administrator: create shops, suspend/reactivate, assign plans, generate/reset local accounts, view requests and audit history.
- Shop ERP: overview, multilingual catalogue, size/colour variants and unique SKU, inventory and reservations, orders, point of sale, shipping, returns, exchanges, customer records, suppliers, purchasing, expenses, cash flow, promotions and reports.
- Custom storefront per shop: identity, colours, descriptions, social links, catalogue, variant selection, basket, local checkout, customer accounts and tracking.
- French, English and Arabic, with RTL layout. Responsive rules for desktop, tablet and phone.
- Encrypted browser-local persistence, encrypted backup/restore, CSV exports with formula-injection protection, printable draft invoices, receipts and local shipping slips.
- Independent illustrative Tamara Trend shop. No partnership, actual product inventory, real address, real telephone or unverified Instagram handle is asserted. Fashion illustration assets were created for this presentation.

## Privacy and access

The entry code is **not present** in the public files. Application HTML, scripts, fonts, image and maintainable source are AES-256-GCM encrypted. Key derivation uses PBKDF2-SHA256 with 600,000 iterations and a random salt. Decryption happens locally using Web Crypto. The derived key is kept only in the tab session; the lock control removes it. Browser records are encrypted with the same derived key and random IVs.

This protects the published presentation from visitors without the code. It is **not** a production authentication system or server-enforced tenant isolation. Demo role switching is intentional. Local credentials and customer accounts only operate in the same browser. No accounts, requests, sales or inventory changes sync across devices. Browser data can be cleared: export encrypted backups regularly. Do not enter real sensitive customer or financial data in this presentation.

## Business invariants

Order quantities reserve available stock during pending/confirmed/preparing stages. Shipping decrements physical stock once. Cancellation releases reservations. Received returns restore physical stock once. Return receipt and financial refund are separate; refunds cannot exceed collected funds. COD deliveries stay uncollected until a payment is recorded. POS uses the same inventory and records cash collection. Purchase receipts cannot be repeated. Products and variants from another shop are rejected in domain operations. Plan limits apply locally to products and team access.

Margins are management estimates: delivered product sales excluding shipping/tax minus snapshotted item costs. Expenses reduce the simplified profit figure. Per-product reports show margin before discounts. These are not statutory accounting statements. Printed invoices are drafts without tax validity; labels are not official carrier labels.

## Connections planned, not live

Cash on delivery, cash pickup and manually reconciled transfers are simulated locally. Edahabia/CIB is explicitly inactive; no card number is requested. Integration requires a server and an approved provider or certified process. Carrier selectors and exports exist for manual operations; no Yalidine, ZR Express or ISC API call is made. The exact ISC provider and documentation still require identification. Instagram/Facebook/TikTok links and WhatsApp links are configurable; no automatic publishing, OAuth account linking or Meta catalogue synchronisation exists.

Official references checked 10 October 2026:
- [GitHub Pages static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [SATIM web-merchant integration](https://www.satim.dz/index.php/fr/e-paiement/integration-webmarchand)
- [Algerian territorial organisation, law 26-06](https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf)

Province selection includes the 69 wilayas in the 2026 territorial organisation. Carrier availability and tariffs must be validated separately before launch.

## Source and rebuilding

`protected/manifest.json` lists encrypted application chunks and a separately encrypted ZIP containing modular source, original editorial image, fonts, build script and tests. Download the decrypted ZIP from Administration → Guide & sauvegarde → Télécharger le projet, or decrypt it locally with the known entry code, manifest salt and iteration count; never publish the entry code or decrypted source if private presentation access is required. Rebuilding preserves the existing salt and uses fresh IVs, so the same entry code preserves access to existing browser data. Changing the entry code requires an explicit data migration.

Unpacked source can be rebuilt using `python source/build.py` with Python's `cryptography` package. It reads the entry code using a hidden prompt. Upload the resulting `public/` directory to this same `/djezz/` path. Do not upload decrypted files. Current site links use hash routes, so GitHub Pages needs no rewrite configuration.

## Validation and limits

9 business invariant tests pass. DOM validation checks 23 screens in each of three languages (69 route/language combinations), encrypted persistence, product variants, reserved-stock errors, POS payment and printing, customer checkout/tracking, shop creation/login/isolation and social links. Encryption build checks successful decryption and wrong-key rejection.

No browser-control capability was available for visual screenshots or measured overflow checks; responsive CSS and DOM were inspected, but phone/tablet layout still needs visual acceptance testing. The presentation is ready to review, not ready for commercial production. Production needs server authentication, tenant authorisation, shared database, tested transaction concurrency, backups, proper billing and official payment/carrier integrations.

## Asset licences

DM Sans and Noto Sans Arabic are distributed under the SIL Open Font License. Original generated editorial imagery is part of the project. The logo and catalogue drawings are custom SVG assets. Font licence notices are included in the encrypted source archive.
