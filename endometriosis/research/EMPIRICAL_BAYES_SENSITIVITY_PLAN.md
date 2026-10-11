# Secondary sensitivity specification

Added **after** the first paired-t/sign-flip results were obtained, before executing this empirical-Bayes sensitivity. This is explicitly post-analysis and cannot replace the original analysis or establish a prespecified positive finding.

Motivation: the four-donor microarray cohort has only three residual degrees of freedom per paired contrast. A standard variance-moderated model can compare the original result with a recognised approach for small microarray experiments.

Method: InMoose 0.9.1 port of limma `lmFit` and `eBayes`, fit an intercept to per-gene **within-donor differences**, independently for EC−EU and EC−NO; use `trend=False` (differences are not mean gene abundance), `robust=True`. Use all 13,827 common mapped genes, retain the original RNA paired-t one-sided p-values, and combine via the same directional maximum/factor-two tests. Report BH and BY across the full common-gene family.

Do not try alternative hyperparameters to obtain a positive result. If the requested robust implementation is unsupported, report that blocker instead of silently switching to non-robust moderation. Compare coefficient estimates to the original paired means as an implementation check. Moderate variance across genes is an additional modelling assumption, not additional biological donors. Exact sign-flip resolution and anatomical control limitations remain unchanged.

Reference: https://inmoose.readthedocs.io/en/stable/generated/inmoose.limma.eBayes.html
