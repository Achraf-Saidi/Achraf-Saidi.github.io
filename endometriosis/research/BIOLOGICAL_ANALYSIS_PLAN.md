# Analysis freeze — paired lesion signatures and anatomical controls

Version 2026-10-11. Written before inspecting gene-level differential effects in the downloaded matrices. This is an internal analysis freeze, **not an external preregistration**.

## Biological question

Which lesion-versus-eutopic expression differences in ovarian endometriosis show the same direction in two original cohorts, and which also distinguish lesions from adjacent ovarian tissue in the second cohort?

This does not test healthy versus diseased individuals, a cell-intrinsic mechanism, fertility, pain relief or an intervention. Site, tissue composition, field effects and pathology can generate associations.

## Resources and exclusions

- GSE105764: original integer bulk RNA-seq matrix, 8 EC/EU sample pairs, pair labels matched by the numeric suffix in the original column names. GEO describes paired ovarian lesions and eutopic endometrium in the secretory phase, without hormonal treatment history. Matrix donor labels differ from GEO's displayed patient numbering; preserve matrix pair labels, do not invent a sample-to-GSM crosswalk.
- GSE86534: processed microarray sample tables, 4 explicitly labelled patients, EC/EU/NO tissues. GEO source labels call NO lesion-adjacent tissue. It is not a healthy-person ovarian control. Use original platform annotation, remove control probes, canonicalise unambiguous symbols and collapse multiple probes by median on the supplied processed scale.
- GSE135485: downloaded but **excluded from biological comparisons**. GEO sample fields say “endometrial samples and lesions” without resolving donor pairing or tissue per sample. No pairing or tissue labels will be guessed.
- GSE25628/GSE179640: metadata investigated only; not part of this analysis.

Distinct original institutions and source studies support treating GSE105764 and GSE86534 as separate cohorts, but original donor identities cannot be directly cross-checked. Both are small cohorts of ovarian disease from China.

## Primary processing

1. Validate nonnegative finite integer RNA counts and unique sample names; retain full library universe for normalisation.
2. RNA scale: log2(CPM + 0.5), using full library sizes. Label-blind expression filter: CPM ≥ 1 in at least 8 of the 16 samples. Map Ensembl to current HGNC only when unambiguous; record unmatched rows. Merge rows mapping to the same canonical gene by summing counts **before** conversion.
3. Microarray: use processed VALUE as supplied. Verify its range and metadata compatibility with a log expression scale; do not log-transform a second time. Canonicalise GeneSymbol using HGNC approved symbols and unique old/alias matches; remove ambiguous multi-gene probes and controls. Collapse by median per gene/sample.
4. Restrict replication testing to the common, expression-filtered, mapped gene universe. Missing/uninterpretable genes are not assigned invented effects.
5. Compute paired differences within donor for RNA EC−EU, array EC−EU, array EC−NO and array NO−EU.

## Statistical analyses

- Descriptive effect: mean paired difference and t-reference confidence interval per platform. Do not pool RNA and array effect sizes as if they were on one measurement scale.
- Student paired t tests are **model-dependent secondary evidence**, assuming approximately normal independent donor differences. Gene-family BH adjustments and Benjamini–Yekutieli sensitivity for arbitrary gene dependence are both reported.
- Directional conjunction: for each specified direction, use the maximum of the one-sided p-values across required contrasts; allow either direction with a factor-two Bonferroni correction. For two cohorts this tests a signal in both. For the three-contrast anatomy screen it also requires a matching lesion–adjacent-ovary direction. Correlations between the two array contrasts do not invalidate this all-contrasts intersection–union construction, provided constituent p-values are valid.
- Exact donor sign-flip p-values are a separate sensitivity analysis under sign symmetry. They are not causal randomisation tests for these observational tissues. Enumerate all 2^n signs, include the observed assignment, account for ties. With 4 array donors, the two-sided minimum is 0.125: this sensitivity cannot establish a 5% replicated gene claim even before multiple testing. Do not conceal this resolution limit.
- Leave one donor out in each cohort and recompute the sign of the mean difference. This is a descriptive stability diagnostic, not a selection-adjusted guarantee.
- RNA normalisation sensitivity: median-ratio size factors from genes positive in all samples; repeat effect-direction assessment. Do not substitute adjusted p-values after observing results.
- Array collapse sensitivity: mean versus median of annotated probes; assess sign robustness.

## Reports

Publish the full common-gene result table, acquisition SHA-256 manifest, exclusions, cohort/sample/pair audit, descriptive signature rankings, model-dependent and sign-flip results side by side. No causal target ranking or recommended drug. Review known literature for any highlighted gene before describing its novelty.

The potential scientific value is a reproducible anatomy-aware evidence audit and a defensible next biological experiment, not a claim that these established statistical tools constitute a cure.
