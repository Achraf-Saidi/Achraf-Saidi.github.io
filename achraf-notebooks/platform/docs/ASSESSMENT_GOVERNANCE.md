# Achraf Notebooks — Assessment governance

## Editorial status and prerequisites

The bilingual learning atlas maps 151 modules across 13 schools, with 92 expanded drafts and 59 guided syllabi. The Statistical Inference & Bayes pilot alone has a server-side assessment engine, but no real approved private question bank is yet loaded. Public self-check questions never count towards authenticated exam mastery.

The pilot sequence is D3 (joint probability), D6 (statistical inference), D9 (generalized linear models), D13 (Bayesian computation), followed by a comprehensive final.

## Assessments

- Module exam: 10 randomized questions in 35 minutes, pass threshold 80%. Four numerical questions are mandatory.
- Final: 24 randomized questions in 70 minutes, pass threshold 85%, with at least 50% correct in each domain.
- Daily limit: three exam starts per user per rolling 24 hours; only one open attempt per examination. A server transaction locks attempts for grading.
- Real source items: minimum 16 per module, including four numerical and eight intermediate/advanced difficulty questions, for a pilot total of at least 64.
- Answers and rationales: kept only in private PostgreSQL, never in public GitHub Pages, bundled JavaScript, the public Git checkout or API responses before submission.
- No anti-cheating guarantee: an unproctored browser exam cannot establish identity or exclude use of outside assistance.

## Private question import and review

Prepare a private JSON bank outside this public repository. On the VPS, after applying learning SQL migrations 003 through 005, execute:

    DATABASE_URL=... node scripts/import-private-bank.mjs /run/private/academic-item-bank.json

Draft import is disabled by default. All imported items receive approved=FALSE and active=FALSE. Only a human reviewer who inspected all formulae, assumptions, translation equivalence, correct answers, distractors and tolerances should authorize activation, using a separate controlled database operation recording reviewer ID and review timestamp. An approved item cannot be overwritten through the importer: create a new versioned ID instead.

Example JSON shape for a **private numeric question** (demonstration only, not a real exam question):

    {
      "id":"D3.001","module_id":"D3","kind":"number",
      "prompt_fr":"Description complète et contextualisée en français",
      "prompt_en":"Full contextualized English mathematical question",
      "options_fr":null,"options_en":null,
      "secret_answer":{"value":0.3,"absoluteTolerance":0.001},
      "explanation_fr":"Explication mathématique détaillée de la réponse",
      "explanation_en":"Detailed mathematical answer explanation",
      "difficulty":4
    }

For choice questions, kind is choice, options_fr and options_en are arrays in corresponding original order, and secret_answer.value is the zero-based correct option index. No sensitive real item should be included in a public fixture.

## Capstone and certification

The statistical pilot capstone requires a fully reproducible synthetic binary-risk study: logistic-regression derivation and gradient checks, training-only preprocessing, baselines, Bayesian prior and MCMC diagnostics, Brier score, log loss, subgroup calibration and discussion of dataset shift and limitations.

Academic review uses a 100-point rubric:

| Criterion | Weight |
| --- | ---: |
| Study design and estimand | 20 |
| Mathematical derivations | 20 |
| Reproducible implementation | 25 |
| Validation, uncertainty and limitations | 25 |
| Communication and reproducibility | 10 |

The project passes with at least 85/100 and explicit approval from a named human reviewer. The review must refer to the exact submission version; any resubmission resets approval. The certificate is issued only after four module passes, a passing final, a passing version-matched capstone and explicit public-name consent.

Every certificate must identify itself as an independent unaccredited self-paced achievement certificate, not a university qualification, professionally proctored certification or verified identity. Public verification discloses only consented display name, track, results and issue date. Certificates can be revoked.

## Remaining release blockers

Add and independently review the real private bank, integrate end-to-end tests against PostgreSQL, assess instructional validity and accessibility, add audit logs, exam integrity monitoring, GDPR access/deletion, backups and restore, real business tax/consumer-law review, complete Better Auth and Stripe test mode, and deploy behind HTTPS. No real payment or certificate should be marketed before those tasks are passed.

Further official references: https://wstg.owasp.org/, https://www.postgresql.org/docs/current/explicit-locking.html, https://better-auth.com/docs/integrations/express, https://docs.stripe.com/webhooks/signature.
