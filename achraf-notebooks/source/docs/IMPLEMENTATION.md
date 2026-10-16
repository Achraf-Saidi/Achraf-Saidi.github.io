# Implementation report · initial edition · 16 October 2026

## Shipped

- Astro/Starlight/MDX/TypeScript static source and project-subpath configuration.
- 12 original concepts in French and English: numbers, algebra, functions, limits,
  derivatives, conditional probability/Bayes, vectors/matrices, Python, R, regression,
  backpropagation and biological/multi-omics foundations.
- Homepage; hierarchical reading UI; prerequisite links; equivalent-page language
  switch; previous/next; Pagefind search; math/code rendering; glossary and references.
- Five deterministic mathematical laboratories: secant/tangent, medical-test Bayes,
  2D matrix transformation, linear-regression gradient descent, tiny-network gradients.
- Single-choice and numerical practice questions with explanations and local attempts.
- Local completion/bookmarks/study notes; versioned JSON export and validated import.
- Lazy worker-based Python and R code labs with explicit stop/reset and downloadable code.
- Two real-data projects (Iris centroid classification; Wine PCA reconstruction) and
  two synthetic reference experiments (linear optimization; all-four-parameter gradient check).
- Four starters, four reference notebooks, plain scripts, pinned dependencies and observed outputs.
- 12-school/136-module curriculum, prerequisite DAG, outcomes, effort estimates and
  references; original source bibliography, video resources, editorial and licence guidance.

## Verified in this execution

- Astro type checks: zero errors/warnings.
- 11 Node tests: mathematical calculations, finite-difference gradients, convergence/
  divergence, quiz tolerance, prerequisite DAG, bilingual lesson presence, progress schema.
- 26 Python lesson and code-lab snippets executed successfully.
- All four Python project scripts executed. Iris: 105 train/45 test; accuracy 37/45,
  baseline 15/45; manual and pipeline predictions identical. Wine: 124 train/54 test;
  PCA test standardized reconstruction MSE 0.4008847666, baseline 0.9294237735.
- Backpropagation four-parameter finite-difference max absolute discrepancy 9.43e-12.
- Static build, Pagefind indexing, internal routes/assets/anchors and locale alternates.
  Exact counts and size are recorded in build-verification.json.
- Both worker scripts pass Node syntax checks. This does not validate browser WASM execution.

## Verification limits

The control-browser capability was unavailable. No preview server, browser screenshot,
mobile/device interaction test, full accessibility audit, browser search query, progress
UI roundtrip or end-to-end Pyodide/webR execution was performed. These are outstanding
checks. No Lighthouse score or WCAG certification is claimed. No independent scientific
review has been recorded. External references have checked landing-page metadata/access;
this is not a comprehensive audit of all linked content or a perpetual availability promise.

## Partial / planned

The roadmap is broad, the written courses are an initial foundation. In particular:
complete statistics/Bayesian/optimization tracks, SQL/NoSQL runtime, RL, advanced DL/LLMs,
complete chronological history, multi-select/matching/ordering quizzes, offline support,
a rights-verified real-cohort multi-omics solution and named scientific review are future work.
The planned-module technical topic inventory is currently English, explicitly labelled
as such in French; published lesson prose and learning outcomes are bilingual.

## Publication

Available GitHub tools verified Achraf-Saidi's account and its existing public umbrella
Pages repository. They do not expose repository creation. The project is therefore
isolated under achraf-notebooks/ with editable source in source/, preserving existing
sites and deployment settings. A new scoped verification workflow accompanies source.
The existing branch-based Pages build deploys committed compiled assets.
Live deployment status and commit evidence are recorded separately in DEPLOYMENT.json
when confirmed. Do not infer success solely from this report or a successful local build.
