# Belgium / EU launch gates — Achraf Notebooks

**Not legal or tax advice.** Status: blocker list, 12 November 2026. A Belgian accountant and qualified consumer/e-commerce legal adviser should sign off before enabling `BILLING_ENABLED=true` or using live Stripe keys.

## Commercial compliance

- Identify the legal seller (independent business, legal entity, or employer-compatible arrangement), enterprise/VAT numbers where required, physical contact address, customer support and complaints channels. Confirm compatibility with academic assistant obligations.
- Publish correct precontractual pricing, whether prices include VAT, recurrence and duration, automatic renewal, cancellation, access scope, technical requirements, refund policy, supported languages and non-accreditation disclaimer.
- Provide consumer withdrawal information and legally required confirmation; never assume every online course automatically qualifies as downloadable digital content for immediate irrevocable withdrawal. Belgian rules distinguish online services from some digital-content contracts. Obtain explicit consumer instructions/acknowledgments where legally required and provide confirmation on a durable medium.
- Determine the correct Belgian/foreign VAT treatment and any educational exemption eligibility with an accountant. Cross-border sales may implicate EU OSS and the EU-wide EUR 10,000 threshold for relevant eligible supplies; **do not assume a universal 21% rate or blanket exemption**.
- Verify Stripe Tax registration requirements, refunds, invoice numbers, recurring invoice compliance, credit notes and business versus consumer identification.
- If selling to institutions, separately assess B2B contracting, VAT IDs, invoices, licence seats and procurement terms.

Primary official references:
- SPF Economie — e-commerce: https://economie.fgov.be/fr/themes/ventes/formes-de-vente/e-commerce
- SPF Economie — e-commerce consumer information FAQ: https://economie.fgov.be/fr/themes/entreprises/guidance/pratiques-commerciales/obligations-dinformation-dans/questions-frequemment-posees
- EU Commission VAT OSS: https://vat-one-stop-shop.ec.europa.eu/index_en

## Personal-data controls

- Write a GDPR privacy notice with purposes and legal bases: account email, payment references, learner progress, customer support, hosting provider, retention periods and deletion procedures.
- Record data processor contracts, especially VPS hosting, transactional email, Stripe and analytics services; perform an appropriate cross-border transfer assessment.
- Keep billing records for the legally required period even after an account deletion where a legal duty applies; define controlled deletion or anonymization for learning data.
- Authentication cookies may qualify as strictly necessary; analytics and advertising cookies typically require consent or a documented lawful exemption. Do not add trackers before cookie compliance.
- Restrict admin access and use least-privilege PostgreSQL users; back up and test restoring the database, rotate secrets, log access security events without writing passwords or raw tokens.

Belgian Data Protection Authority: https://www.autoriteprotectiondonnees.be/citoyen/themes/internet/cookies

## Payment and security go-live gates

- [ ] Stripe test-mode cards and delayed payments: success, fail, retry, cancellation.
- [ ] Verified raw-body webhooks, idempotency and duplicate event tests.
- [ ] Correct reconciliation for event reordering, missed events, refunds, disputes and subscription renewal failures.
- [ ] Reliable plan downgrade, trial, cancel-at-period-end, expiration, account deletion and customer mapping.
- [ ] All prices and their currency configured server-side; no arbitrary amount accepted from the browser.
- [ ] Billing default off. Test with test-only keys and verified separate webhook secret.
- [ ] Premium lessons stored in a private database, with access checked for every read.
- [ ] Account signup, email verification, password reset, logout and session revocation tested.
- [ ] HTTPS, strict headers, safe redirects, CSP, CSRF protections, anti-abuse and rate limiting.
- [ ] No trusted execution of learner-supplied Python on the API server.
- [ ] Confirm backups, restore rehearsal, monitoring/alerting and incident response.
- [ ] Versioned migrations, locked and audited dependencies and staged CI deployment.
- [ ] Legal/financial sign-off completed and dated.
- [ ] Independent academic review completed for the exact courses being sold.

Checkout implementation references:
- https://docs.stripe.com/webhooks/signature
- https://docs.stripe.com/payments/checkout
- https://better-auth.com/docs/adapters/postgresql
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

**No go-live until all mandatory checkboxes have evidence.** A checked box is not a substitute for a recorded test, signed legal approval and a functioning recovery plan.
