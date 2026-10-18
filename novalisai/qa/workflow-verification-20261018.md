# Novalis — Workflow experience, 18 October 2026

Source base: `06f445aeffe05395ea379e6db99a23212dfcd1b3`.

## Implemented

- Retained the approved slogans; replaced the old cost dashboard with Novalis Flow, a guided local workflow demonstration. Three translated cases expose the incoming source, preparation, checks, suggested response and human review.
- Missing-information branches halt the workflow and prepare a clarifying question. No model API, message, booking, accounting write or payment is triggered by the showcase.
- Compact mobile-first hero, purposeful entrance animation, staged processing and response typing. Reduced-motion preference makes the process immediate; switching cases cancels pending timers.
- Editable time estimate uses volume × (manual minutes − reviewed minutes). Invalid inputs and no-saving cases are explicit. This is an assumption-based arithmetic illustration, not measured ROI or a project quote.
- Semantic SVG icons replace ambiguous expertise and team glyphs.
- Six-tab Novalis OS example retains documents, milestone approval and progress. Added local, text-safe project feedback and a three-invoice example with dates/statuses. Comments remain in memory only and are clearly marked as demo content.
- Count-free collective copy keeps Achraf Saidi as cofounder and CTO. Owner-supplied partner network in Africa, JetThings and JetNext, competitive budgets and Novalis technical oversight appear in all four languages and on the company page.
- Existing private enquiry tracking, reference-and-email lookup and saved links are retained unchanged.

## Verified locally

- Static Python build: FR, EN, NL, DE, French root, 108 non-redirect translated content pages.
- `node novalisai/qa/premium.cjs`: all four languages, eight concepts, filters/dialogs/zoom, document previews, keyboard tabs, approval, page headings, language and local link/asset existence; contact acknowledgement/failure/retry and private status states.
- `node novalisai/qa/engineering.cjs`: three workflows and missing inputs in each language; reduced motion; cancellation of an in-flight run; estimate boundaries; six-tab navigation; safe comment rendering and persistence between demo tabs; invoice examples without a fake checkout; reference lookup/resume/errors/privacy and stale response protection.
- JavaScript syntax and Python compilation checks.
- Text colour calculations for the new workflow: primary 11.65:1, copper on page 5.66:1, muted labels at least 4.52:1; footer muted text darkened after a 4.30:1 finding. This is a scoped contrast check, not a full accessibility audit.
- The mobile preparation button follows the incoming message visually, above the processing steps, to make the first interaction reachable earlier.
- Existing image/font assets restored from the pinned source. No new external runtime dependency.

## Operational boundaries

Read-only audit of Novalis OS confirms project conversations, client milestone acceptance/rework, versioned shared documents and invoices with due dates/balances. The team can issue separate deposit/intermediate/balance invoices and record verified payments manually. There is no automatic milestone-to-invoice or installment-debit engine. The demonstration does not claim one.

Mollie/Bancontact remains dependent on merchant setup and explicit production activation. No real checkout is exposed in the demo. This change does not modify ERP runtime, authentication, permissions, data, nginx, PostgreSQL or Pointage.

## Published and verified

Published source: `a1cf1c6ec3742f921c82cc40063804f7c8cd1aca`.

- Both source CI runs passed: 39087517288 and 39087514209. All 52 backend tests passed, along with the public and ERP UI suites, Docker build, VPS configuration validation and isolated production build.
- Hostinger publication run 39087732341 succeeded. The server compared 123 live paths against the prepared bytes, including 117 HTML pages, runtime configuration and the main CSS/JavaScript files. Previous public release retained for rollback.
- Public page opened and exercised in Chromium at `https://www.novalisai.com/fr/`. Contact service is available; a guided support scenario produced its expected response. No actual lead or message was created.
- Final version reviewed at ten widths (320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920) in FR/EN/NL/DE: all 40 layouts had loaded CSS and no document overflow. Scrollbar width is excluded from reported client width.
- Invoice view reviewed in four languages at 320, 390, 768 and 1280. An initially clipped German approval label was shortened to “Freigaben” and rechecked at 320; no clipping remains there.
- Real browser checks: workflow result, missing invoice information, arithmetic estimate and invalid input, mobile menu/Escape, client demo comment, milestone approval to 80%, disabled repeat approval, document opening/closing and six invoice tabs. Hero absolute position remained 220 px before/after preparation at desktop width. Mobile result bottom was 868.44 px in an 880 px viewport after the visibility adjustment.
- Real reference lookup with a nonexistent test reference returned its generic not-found state without exposing a private result. No real customer data was accessed. Browser form values are redacted by the control environment; input retention is covered by the automated tests.
- Actual public desktop and Novalis OS invoice screenshots are stored alongside this report. The mobile screenshot comes from the isolated responsive review of the exact published static source. The public site protects against embedding in an iframe; those protections were preserved.
- Pointage body and nginx configuration hashes are unchanged. nginx, PostgreSQL, PM2, Novalis OS and its worker retained the same PIDs before/after publication. ERP current symlink unchanged. No service restart, ERP migration, user/security data or payment-provider change was performed.
- Every authenticated deployment key was revoked after its operation; the final Hostinger key inventory is empty. The post-publication check confirms both services healthy, exact public source bytes and unchanged frame protection (DENY / frame-ancestors none). The unused production iframe QA helpers were removed; the isolated responsive review remains available.

## Remaining operational limits

The showroom and workflow examples are explicitly guided concepts. They do not invoke a paid model or send business actions. The public enquiry and reference-tracking paths use the existing backend.

Merchant activation is still required for real Mollie/Bancontact checkout. Invoice examples do not claim automatic debits or milestone-triggered billing. SMTP/Peppol are not activated by this change.

No physical iPhone/Android, Safari/Firefox, full WCAG audit, Lighthouse or field Core Web Vitals result is claimed. Responsive evidence is from Chromium iframe viewports and the real public desktop page.
