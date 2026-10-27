# Production preservation — client intake, identities and demo separation

This runbook is intentionally conservative: it documents steps but **does not execute them**.

## Scope and non-negotiable guards

- **First real commercial request**: verify the contact's reference/email from a *private* operator environment, never hardcode personal data in Git. Protect all linked lead, intake, public status events, meetings, files, proposals and financial records.
- Production organisation: `novalis`. Demo organisation: `novalis-demo`. Never run a bulk delete, fixture reset or seed against production. Do not delete or alter demonstration accounts and synthetic projects.
- Do not touch any other sites or services on the VPS, including Pointage VDC.
- Scope any future operation to explicit **database IDs and the intended production organisation**. Never assume email/name alone identifies the right data if tenants share one database.

## Before any live mutation

1. Record the running app version, production data path, organisation, encrypted key location and current users. Perform the **read-only** inventory:
   `NOVALIS_PROTECTED_REFERENCE=... NOVALIS_PROTECTED_EMAIL=... python deploy/production-safety-audit.py`.
   Supply the values privately; do not log them to GitHub Actions.
2. Verify that the reference resolves to exactly the intended lead and the email, lead fields and status look correct. The audit prints a SHA256 fingerprint of the entire lead row. If mismatched, STOP.
3. Run a **database-and-files application backup** with `python -m novalis_os.cli backup --destination <new-private-backup-folder>`. Verify the manifest, SQLite integrity, foreign keys and document checksums using `check-backup`.
4. Copy a verified encrypted backup *off the VPS*, including the encryption key stored separately, and perform an isolated restore test. A Hostinger VPS snapshot is only an extra safety net.
5. Inventory users and dependent projects, assigned tasks and time entries. Collect the exact set of genuine production-only rows to retain. A row should not be judged synthetic by its name alone; protect linked business records.
6. Plan scoped suspension rather than hard deletion; preserve foreign keys, audit history, invoices and existing sessions until each change is reviewed. Never suspend the only working administrator.

## Direction identities

- Existing `saidi@novalisai.com`: verify the exact user row, keep it, and update its displayed name to **Nacim Saidi** only after backup and positive ID match. Do not reset the existing password or MFA.
- `achraf@novalisai.com`: verify whether it already exists; if not, create a **Direction** invitation through the normal application API. Display name **Achraf Saidi**. Accept the password privately using the existing activation mechanism.
- The requested shared/testing password is only eight characters and does not satisfy the production password policy (12+). Do **not** weaken the global minimum or place the password in environment files, GitHub or documentation. Use a unique 12+-character password instead.
- If explicitly required, an individual MFA exception can be set **only in the private production environment** with `NOVALIS_MFA_EXEMPT_EMAILS=achraf@novalisai.com`, preserving MFA requirements for every other direction account. A pre-existing TOTP setup still needs an individually authorized reset/revocation after a backup; do not silently purge it.
- Do not change passwords, roles or MFA for demo organisation accounts.

## Prospect messages

- The new conversation is a separate **append-only** `lead_public_messages` table linked by `lead_intake.lead_id`. Existing contact details, request content, offer, status events and quote versions are not edited.
- Internal staff can explicitly publish shared notes; these should NEVER be confused with private scoping notes or quotations.
- A prospect sees full messages and may reply only via their **secret tracking link**; reference + email can show a coarse status only. Links expire after 90 days: plan a proper reissue/authentication flow before long-lived communication.
- Prospect response notifications remain internal; staff-to-prospect email notification is queued, not guaranteed delivered unless the mail worker and SMTP are configured.

## Acceptance criteria before releasing

- Application backup restored offline; exactly one protected lead and its complete chain intact before/after release.
- Relevant API/UX tests, negative access tests, and browser tests green. New messages work bidirectionally only with allowed identities/tokens; expired links and cross-tenant requests are rejected.
- Old test demo users, projects and invoices present and unchanged; first real customer offer, pricing, history and document attachments unchanged.
- No changes to unrelated VPS services or vitrine content except the tracking page's conversation controls and asset versions.
- Perform a staged rollout and health checks. Do not migrate the production database until compatibility has been reviewed.
- Post-deploy read-only audit must show unchanged lead fingerprint and demo tenant counts; if not, roll back code and restore data only through a verified recovery plan.

**This file is not a declaration that any production account has been modified or cleaned.**
