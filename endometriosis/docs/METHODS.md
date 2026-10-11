# EndoScope 0.1 — mathematical specification and limitations

## 1. Biological replicate is the donor

For raw counts (x_{icg}), aggregate cells of type (c) within donor (i):

\[
Y_{icg}=\sum_{j\in\mathcal C_{ic}} x_{ijg}.
\]

The implemented CLI starts **after** this aggregation. It does not process FASTQ, doublets, ambient RNA or cell annotations. Donors are independent; repeated or paired samples require a different model. A complete gene × donor grid prevents missing counts being mistaken for zeros.

For each study and cell type, define library size on the full supplied count universe:

\[
L_{ic}=\sum_gY_{icg},\qquad Z_{icg}=\log_2(1+10^6Y_{icg}/L_{ic}).
\]

This is simple library-size normalization, not TMM, size-factor estimation or a negative-binomial model. CPM is compositional: changes in one subset can induce relative changes in others. A minimum total count threshold of 10 is fixed before testing, configurable through the CLI and recorded in the audit. Low-count filtering is not selected by significance. Any failed model stops the analysis rather than silently dropping a tested gene.

## 2. Exploratory covariate-adjusted model

Within a homogeneous tissue/contrast:

\[
Z_g=X\theta_g+\epsilon_g,\qquad X=[1,D,\mathrm{phase},\mathrm{batch},\mathrm{hormone}].
\]

(D=1) for case and 0 for control. Categorical covariates are dummy coded with their lexicographically first level as reference. The coefficient of (D) is case minus control, conditional on the supplied covariates. Continuous age, ancestry, cycle-day trends and interactions are not implemented. Common support and unmeasured confounding remain external checks.

OLS estimates and MacKinnon–White HC3 covariance are:

\[
\hat\theta=(X^TX)^{-1}X^TZ,
\quad\hat V_{HC3}=(X^TX)^{-1}X^T
\operatorname{diag}\left(\frac{\hat\epsilon_i^2}{(1-h_{ii})^2}\right)
X(X^TX)^{-1}.
\]

The CLI reports a two-sided approximate t-reference test with (n-\operatorname{rank}(X)) degrees of freedom. This is not an exact finite-sample test for arbitrary heteroscedastic errors. It refuses rank-deficient designs, leverage effectively equal to 1, fewer than three residual degrees of freedom, fewer than three donors per group, and zero standard errors. Three donors are a software floor, not a power recommendation.

Compare against established donor-level count models such as edgeR/DESeq2 and appropriate mixed models. Inspect model residuals and effect estimates before interpretation. HC3 does not repair batch–disease confounding or selection bias.

## 3. Multiple testing

For sorted p-values (p_{(1)}\le\cdots\le p_{(m)}), BH adjusted values are

\[
q_{(i)}=\min_{j\ge i}\{1,mp_{(j)}/j\}.
\]

Study-level family: all tested genes within study × cell type × contrast. Browser meta-family: all imported gene effects within cell type × effect scale × contrast. Supplying only significant genes invalidates these adjustments. BH guarantees depend on valid p-values and suitable dependence assumptions; arbitrary dependence and invalid input inference are not solved here. A valid family does not imply global FDR control across all cell types, analyses and adaptively chosen filters. Use a prespecified global or hierarchical procedure if making such claims.

## 4. Descriptive effect pooling

For comparable effects (\beta_s) and independent standard errors (\sigma_s):

\[
w_s=\sigma_s^{-2},\quad
\hat\mu=\frac{\sum_sw_s\beta_s}{\sum_sw_s},\quad
SE(\hat\mu)=\sqrt{1/\sum_sw_s}.
\]

The browser reports normal-reference intervals (\hat\mu\pm1.96SE) and approximate two-sided normal p-values. This is a **common-effect model**, not a general transportability claim. With sparse donor samples or few studies these intervals can understate uncertainty. Displayed per-study forest intervals also use a normal approximation; the Python summary includes approximate t intervals from the original model.

\[
Q=\sum_sw_s(\beta_s-\hat\mu)^2,\qquad
I^2=\max\left(0,\frac{Q-(k-1)}{Q}\right).
\]

(I^2=0) when (Q=0); a single study has no informative heterogeneity assessment and cannot pass replication filters. Low estimated I² with very few studies is weak evidence about actual heterogeneity.

The Python library additionally provides a DerSimonian–Laird baseline:

\[
\hat\tau^2=\max\left(0,\frac{Q-(k-1)}{\sum w_s-\sum w_s^2/\sum w_s}\right),
\quad w_s^*=1/(\sigma_s^2+\hat\tau^2).
\]

Its interval also uses a normal reference. It does not implement Hartung–Knapp, a prediction interval or calibrated few-study inference.

## 5. Replication filters and sensitivity

Default exploratory filters: at least two studies, distinct declared cohort labels, identical nonzero effect direction, at least two within-study BH values ≤0.05, combined BH ≤0.05, I² ≤0.5, and a configurable effect floor. Sorting prioritizes passed filters, replicated significance and low heterogeneity; it does not estimate therapeutic benefit. Effect magnitude should be judged within a specified scale, not globally across mixed scales.

With at least three studies, leave each study out and recalculate the common effect. “Stable” means the remaining estimated effect has the same sign and its normal interval excludes zero in every removal. It is a diagnostic, not a selection-adjusted confidence guarantee, and is displayed separately from filter eligibility.

Same cohort labels are flagged in the browser and refused by Python pooling. Distinct labels may conceal shared donors. HECA and Fonseca cannot be assumed independent; older and newer GWAS may overlap. Independence requires source-level auditing. The browser requires a user attestation before reporting imported data as eligible.

## 6. Executed synthetic experiment

`simulate.py` creates two reproducible artifacts: artificial pseudobulk counts and a null pseudoreplication comparison. The latter generates independent donor random intercepts, 40 correlated cells per donor, no group effect, then compares Welch tests on pooled cells versus donor means over 500 repetitions. Rejection proportions and Monte Carlo Wilson intervals are reported. This demonstrates a known statistical issue under this generator; it is not evidence about endometriosis or the full pipeline’s validity.

## 7. Limits on scientific claims

Expression association does not establish causality, a gene intervention’s direction, selectivity, safety, fertility impact or clinical efficacy. No human transcriptomic matrix has been downloaded or analysed in this release. No real therapeutic candidate is ranked. Novelty is not asserted: OLS, HC3, BH, pseudobulk, meta-analysis and leave-one-out are established tools.

## Method references

- Squair et al., *Confronting false discoveries in single-cell differential expression*, Nature Communications (2021): https://doi.org/10.1038/s41467-021-25960-2
- Benjamini & Hochberg, *Controlling the False Discovery Rate*, JRSS B (1995): https://doi.org/10.1111/j.2517-6161.1995.tb02031.x
- HC3 implementation reference, statsmodels: https://www.statsmodels.org/stable/generated/statsmodels.stats.sandwich_covariance.cov_hc3.html
