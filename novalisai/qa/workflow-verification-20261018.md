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
- Existing image/font assets restored from the pinned source. No new external runtime dependency.

## Operational boundaries

Read-only audit of Novalis OS confirms project conversations, client milestone acceptance/rework, versioned shared documents and invoices with due dates/balances. The team can issue separate deposit/intermediate/balance invoices and record verified payments manually. There is no automatic milestone-to-invoice or installment-debit engine. The demonstration does not claim one.

Mollie/Bancontact remains dependent on merchant setup and explicit production activation. No real checkout is exposed in the demo. This change does not modify ERP runtime, authentication, permissions, data, nginx, PostgreSQL or Pointage.

## Publication and remaining checks

Hostinger connector returned `UNAUTHORIZED`, `oauth_token_invalid_grant`, requiring reauthentication on 18 October. The changes are prepared for review on GitHub; they have not been published to novalisai.com. No claim is made of visual mobile-browser verification, overflow measurements, Lighthouse/Core Web Vitals or live production regression checks for this edition. Those checks and the atomic public-release swap remain pending restored access. Pointage and the active ERP have not been changed during this iteration.
