# Proposed research protocol — not preregistered, not validated

Owner: Achraf Saidi. Version 0.1, 2026-10-11.

## Objective

Assess whether uncertainty-aware replication across independently sampled cohorts can yield more reproducible endometriosis-associated molecular hypotheses than discovery-only rankings. Link hypotheses to specific cell states, audit reuse of donors and study population differences, and explicitly abstain where evidence is insufficient.

## Novelty gate

This project’s current calculations use existing methods. Before claiming innovation, perform a reproducible literature search covering independent validation of endometriosis single-cell signatures, cross-cohort meta-analysis, genetic prioritisation, shift-aware inference and selective abstention. Include 2026 publications, particularly PMID 42056605 and PMID 42161907. Compare the proposed approach with HECA and existing endometriosis atlases. A new interface is not a new biological discovery.

Candidate contribution to evaluate: a benchmark with donor-overlap audit, held-out cohorts and clinically relevant stratification, coupled to a quantitatively validated rule for withholding unreliable hypotheses. Its novelty, validity and usefulness remain research questions.

## Prespecified contrasts

Primary discovery comparison must be defined before acquisition. Do not silently combine lesions versus normal endometrium with disease versus control eutopic endometrium: these are different biological contrasts. Specify tissue site, cell annotation granularity, phase of cycle, hormonal treatment status and eligibility. Separate cohorts by original donors, not by publication.

The delivered Python baseline supports only one homogeneous tissue per run and unpaired independent donors. Pairing, repeated sampling, longitudinal endpoints and lesion-specific models require extension and separate validation.

## Evaluation design

1. Freeze a discovery cohort and a distinct validation cohort after overlap audit.
2. Freeze count filtering, annotations, covariates, gene universe and thresholds. Define primary versus secondary analyses.
3. Compare discovery-only rankings, common-effect pooling, established count-based differential expression, random-effect baselines and replication filters.
4. Under simulation: vary sample size, effect prevalence, batch confounding, donor correlation, composition changes and study heterogeneity. Report false positive rate, family FDR where justified, power, interval coverage and abstention frequency, each with Monte Carlo uncertainty.
5. Under real data: assess effect direction, replication rate, cell-state specificity and out-of-cohort robustness. Provide all eligible genes, not only top hits, and report negative results.
6. Repeat after removing each original cohort and each suspected confounder stratum. Do not tune thresholds against the held-out outcome.

No distribution-free or anytime-valid claim is made. Survival calibration or sequential testing from the doctoral work is not automatically applicable to these transcriptomic analyses.

## Mechanistic and therapeutic progression

Only after independent replication, investigate genetic support with fine-mapping and colocalisation using ancestry-aware LD and appropriate tissue QTL data. A nearby gene is not necessarily the causal gene. Distinguish discovery associations, causal evidence, pharmacological tractability and fertility safety.

Potential hypotheses must be discussed with endometriosis biologists and clinical specialists. Design perturbation experiments with appropriate biological models, negative controls, technical and biological replication, and prespecified endpoints. Pain, lesion burden and fertility are distinct outcomes. An expression signature cannot validate a cure.

Drug/target predictions, if later developed, must remain research hypotheses until preclinical and clinical evidence establishes the relevant claims. No dosing or patient recommendations are part of this platform.

## Publication readiness

Required: source data rights, reproducible acquisition manifests, frozen analysis environment, original cohort mapping, complete methods, appropriate baseline comparisons, independent validation, external specialist review and a claim-by-claim novelty assessment. Clinical effectiveness requires separate ethically approved clinical work.

## Current release

Delivered: sourced catalogue, bibliographic graph, stateless local web lab, synthetic benchmark, exploratory donor-level model, effect pooling, FDR and sensitivity diagnostics, documented limitations, tests and code.

Pending: audited biological datasets, independent real-data replication, validated causal/therapeutic hypotheses and experiments. No cure or major biological advance is claimed.
