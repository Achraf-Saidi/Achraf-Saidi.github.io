# Personal Workspace — Achraf Saidi

## Pages

- Project launcher: `/apps/`
- Achraf & Rayan finances: `/apps/finances/`

The launcher links to existing published paths `/sahati/`, `/numeria/`, `/djezz/`, `/aion/`, `/athar/`, and the Novalis OS application at `https://app.novalisai.com/os/`. JetNext did not have a confirmed deployed address when this page was prepared: its card permits a browser-local HTTPS link to be configured without inventing a domain.

## Financial modeling

Financial seed data are exclusively in `assets/finance.enc.json`, encrypted with AES-256-GCM after PBKDF2-SHA256 key derivation (480,000 iterations, random salt and IV). **Do not commit the plaintext or the passphrase.** A unique 96-bit IV is generated for each browser-side save; the additional authenticated data is `achraf-rayan-ledger-v1`.

Amounts are stored as Algerian **centimes** (common-language “anciens”): 100 centimes = 1 DZD. They are manually supplied project indicators, not audited bank balances or certified distributable profits. The current model records SAHATI +4bn cts, Numeria -800m cts, ATHAR -320m cts, JetNext +5.7bn cts, with the partners' stated percentages. The Numeria ownership allocation remains intentionally unknown.

Each attributed result equals the signed project result multiplied by the individual's percentage. Partner net positions are sums of their known attributions. The suggested common reserve is a **scenario**: `rate × max(0, Achraf net) + rate × max(0, Rayan net)`. Default 20% is a UI starting point, not an amount transferred. Prospective allocations are hypothetical and editable.

The browser stores modifications as encrypted data in localStorage, not on GitHub or a backend. For cross-device transfer use **Sauvegarde chiffrée** and **Restaurer une sauvegarde**. Clearing browser storage without exporting removes local edits.

## Security limitations

GitHub Pages is public static hosting; this is client-side ciphertext protection, **not** server-enforced authorization, RBAC, or an audit trail. Metadata (page existence and public project names) is public. A malicious script executing on this origin, malicious browser extension, compromised device, or weak/compromised secret may undermine confidentiality. Do not use as the definitive system for real sensitive accounts, legal ownership records, or live financial transactions. For those, use a private backend with authenticated users, server-side access checks and encrypted storage.

## Maintenance

Files:
- `index.html`: launcher
- `finances/index.html`: locked dashboard shell
- `assets/styles.css`: shared layout
- `assets/portal.js`: local configurable shortcut
- `assets/vault.js`: cryptography, presentation and local edits
- `assets/finance.enc.json`: ciphertext only

The academic homepage at `/` remains intact; only its navigation gains a “Mes projets” link.
