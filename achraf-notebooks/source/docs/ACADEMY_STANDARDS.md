# Academic quality gates — Achraf Notebooks AI Academy

Status: editorial specification (12 November 2026). This is not a claim of accreditation, independent peer review, or equivalence to an external course platform.

## Three different states

- **Guided syllabus**: the module has a topic map, prerequisite edges and links, but no sufficiently worked course; it is not sold as complete.
- **Expanded draft**: original FR/EN teaching exposition, mathematical reasoning, code, solved problem and self-checkpoint, as presently tracked in `curriculum/academy-expansions.json`. Expansions are author drafts and are not independently reviewed. There are **70** of these out of 151.
- **Reviewed course**: this status must be manually conferred only after a qualified independent reviewer checks the scientific content, mathematical derivations, code execution, assumptions, fairness of assessments and accessibility. The current expanded drafts are **not** certified reviewed.

The public Starlight notebook collection has its own lesson inventory. Counts for Starlight releases, Academy expanded drafts and the complete roadmap are distinct and must never be added together as though they were independent modules.

## Definition of a sellable complete course (not yet met for the 70 drafts)

A chapter must include:

1. Learning objectives that can be assessed; audience and prerequisite diagnostics.
2. Definitions, precise notation and a worked intuition.
3. Stepwise mathematical derivations with assumptions and counterexamples.
4. At least two substantial worked examples, including one manually calculated numerical example.
5. Reproducible Python code with deterministic seed, pinned dependency requirements, readable assertions and appropriate datasets with verified rights.
6. Interactive coding tasks in a sandbox isolated from server resources; never execute untrusted learners' Python directly on the API server.
7. A quiz bank with multiple distinct questions and explanations, not merely one self-reported completion checkbox.
8. A genuinely graded assignment with hidden test cases and a transparent scoring rubric.
9. Failure-mode, uncertainty, evaluation and ethics/robustness sections appropriate to the subject.
10. FR and EN reviews by competent editors; glossary, accessibility audit, mobile testing, factual references and a named editorial revision record.

**A live completion certificate must not be offered without real graded evidence.** Scores saved in localStorage are self-assessment only. Product positioning and prices must be user-tested, not inferred from curriculum size.

## Recommended learning spine

- **Foundations**: A1–A11, B1–B11, C1–C9, D1–D17. Priority A3, A4, A5, A6, A8, A11, B6, B10, D3, D6, D9, D13 and D16.
- **ML engineering**: E1–E8, F1–F14. Priority F3, F7, F8, F10, F11, F14 plus data leakage, calibration, shift, robust evaluation.
- **Deep learning**: G1–G12. Priority G2, G3, G4, G5, G6, G9 with training experiments and memory/profiling analysis.
- **Foundation models**: H1–H14. Priority H4, H5, H6, H7, H8, H12 and H14, with verified primary sources and dates.
- **Sequential reasoning and application**: I1–I11, J1–J10, K1–K10, L1–L9; embodied AI modules M1–M15 as optional applied AI electives.
- **Capstone**: a supervised learning, probabilistic inference, deep learning and foundation-model project each with sealed test data and a scientific report.

## Acceptance pipeline

`planned → expanded draft → author technical checks → independent scientific review → browser & accessibility QA → released course → eligible for an evaluated paid bundle`.

Each gate requires recorded evidence. CI now checks the catalog, JS syntax and the 20 newly authored Python demos, but automated success alone does not award independent scientific-review status.

## Safety

Do not turn a publicly available CC BY text or a static source on GitHub Pages into a pretend private file. Distinct paid projects must originate in genuinely private storage and comply with original licences. Do not copy video lectures or copyrighted teaching materials without permission.
