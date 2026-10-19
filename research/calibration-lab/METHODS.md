# Statistical protocol — Survival Calibration Lab v1.0.0

Author: Achraf Saidi. Cadrage: *Continuous Calibration Monitoring of Survival Predictions under Right Censoring*, doctoral document supplied for implementation.

This implementation is new simulation code. It does not import unpublished earlier simulation results, reproduce a particular paper's algorithm, establish a literature gap, or solve the unknown-censoring validity problem.

## 1. Target, assessment order and filtration

Fix a horizon τ. The deployed rule issues p_i=f_τ(X_i); its target is Y_i=1{T_i>τ}. The null is

$$
H_0:\quad \mathbb E[Y_i\mid p_i,\mathcal F_{i-1}]=p_i.
$$

Patients arrive at increasing times A_i, regularly or through exponential interarrival times. Every patient enters monitoring at A_i+τ, even if an event or censoring is observed earlier. Equal assessment delays preserve arrival order.

The evaluation filtration contains the complete assessed observations of previously evaluated patients and the independent historical sample. Pending patients' partial outcomes are not used by the estimator or betting strategies. This protocol does not claim validity for an enlarged filtration revealing all pending outcomes as they occur.

The future simulation is pre-generated for reproducibility, but the monitoring and nuisance-estimation updates consume only the prescribed mature prefix. The interface also restricts plotted scores to that prefix.

## 2. Event-time generator

The covariates are x_i and z_i∈{0,1}. The fixed predictor is

$$
\ell_i=\operatorname{logit}(p_0)+\beta x_i+\gamma z_i,\qquad p_i=\sigma(\ell_i).
$$

The change starts after floor(change × N) patients. Its intensity d_i is zero before the change and then either one or a linear ramp. Actual survival is

$$
S_i^*=\sigma\left(\ell_i+\delta_0+d_i\{\delta+\kappa(\ell_i-\operatorname{logit}(p_0))+\eta z_i\}\right).
$$

With every prediction-error coefficient zero, S_i^*=p_i exactly, even if the distribution of X changes. x is a normal variable with an optional drifting mean, truncated to [-4,4]. The group prevalence can also change and is kept in [.01,.99].

For an independent uniform U_i,

$$
T_i=\tau\left(\frac{-\log U_i}{-\log S_i^*}\right)^{1/k}.
$$

Thus P(T_i>τ|X_i)=S_i^*. Changing τ generates a new experiment with the reference prediction probability defined at that horizon. It is not simultaneous inference at multiple horizons on one fixed event-time distribution.

## 3. Censoring law and observed data

With a=-log(1-q),

$$
G_i^*=\max\{g_{\min},\exp[-a\exp(bx_i+cz_i+d_i\Delta_C)]\}.
$$

C is exponential conditional on the profile and change intensity, with

$$
C_i=\tau\frac{-\log V_i}{-\log G_i^*},\qquad
G_i^*(t)=(G_i^*)^{t/\tau}.
$$

Disabling censoring sets C=∞ and G=1. q is the potential censoring probability at the reference profile before drift; it is not the realized proportion with unknown Y.

At assessment the available quantities are U_i=min(T_i,C_i,τ), the indicator d_C=1{C_i<T_i,C_i<τ}, and the observed-event indicator d_T=1{T_i≤C_i,T_i≤τ}. Continuous times make exact ties probability zero.

- d_C=1: Y is unknown.
- d_T=1: Y=0 is known.
- R_i=1{T_i>τ,C_i>τ}=1: Y=1 is known.

These three statuses partition the sample. R=0 does not by itself mean an event occurred.

The default U_i and V_i are independent conditional on X and the scenario state. A Gaussian copula with correlation ρ is available as an assumption-violation experiment. It preserves the marginal event and censoring laws, but ρ≠0 invalidates conditional-independent-censoring identification. In that case the independence-based expected nuisance and plug-in scores are null in exported records and the decomposition is disabled.

## 4. Scores and the plug-in error

Under conditional independence and G_i^*≥g_min,

$$
\mathbb E[R_i\mid X_i,\mathcal F_{i-1}]=S_i^*G_i^*,\qquad
\mathbb E[R_i/G_i^*\mid X_i,\mathcal F_{i-1}]=S_i^*.
$$

The four scores are

| Key | Score | Interpretation |
| --- | --- | --- |
| full | Y_i−p_i | Uncensored simulation benchmark |
| naive | R_i−p_i | Deliberately ignores censoring |
| oracle | R_i/G_i^*−p_i | IPCW with known true censoring law |
| plugin | R_i/Ĝ_i−p_i | IPCW with a learned, optionally perturbed/clipped censoring law |

Under conditional independence,

$$
\mathbb E[\psi_i^{plugin}\mid X_i,\mathcal F_{i-1}]
=(S_i^*-p_i)+S_i^*(G_i^*/\widehat G_i-1).
$$

The first term is predictive error. The second is nuisance-induced error. Past-only training prevents information leakage; it does not make the second term zero. A consistent estimator alone does not establish an exact finite-sample anytime guarantee.

## 5. Observed-data nuisance fitting

Historical patients are independent of monitored patients and horizon-mature at calendar time zero. The estimator receives **only** (index,x,group,p,U,d_C). It never receives latent T,C,Y,S* or G*.

For monitored patient i:

1. Refit on the historical sample plus previously assessed patients when the predeclared refit schedule calls for it.
2. Predict Ĝ_i before inserting patient i.
3. Compute every score and update every monitor.
4. Insert the observed record for i into the training bank.

Frozen training uses only the original historical fit. Expanding training includes the whole past. Sliding training uses the latest configured number of past observations. fitThrough records the largest monitoring index available at the latest refit, and is always less than i.

### Reverse Kaplan–Meier

Censoring is the target event; an observed T right-censors C. At censoring time u,

$$
\widehat G(t-)=\prod_{u<t}\left(1-\frac{d_C(u)}{r(u)}\right).
$$

Administrative observations at τ remove subjects without a censoring event. A marginal KM can be misspecified when both event time and censoring depend on X.

### Stratified reverse KM

Six predeclared strata: binary group × [0,1/3), [1/3,2/3), [2/3,1]. Strata with fewer than ten observations fall back to the pooled KM. Coarse strata do not guarantee conditional independence within each stratum.

### Conditional exponential model

Let z_i=(1,x_i,group_i) and λ_C,i=exp(θ'z_i)/τ. Fit the observed-data log likelihood

$$
\ell(\theta)
=\sum_i\{d_{C,i}\theta'z_i-\exp(\theta'z_i)U_i/\tau\}
-\frac{0.05}{2}(\theta_1^2+\theta_2^2).
$$

Newton updates use the analytic score and information matrix, backtracking and numerical guards. The active generator positivity floor can make this model misspecified at extreme profiles. Drift and ρ≠0 can also violate its working assumptions.

### Perturbation and clipping

A deliberate logit perturbation is scaled by t/τ:

$$
\widehat G_{\text{biased}}(t)
=\sigma[\operatorname{logit}\widehat G_{\text{fit}}(t)+B(t/\tau)],
\qquad
\widehat G_{\text{used}}(t)=\max(\epsilon,\widehat G_{\text{biased}}(t)).
$$

When B=0 the fitted value is used exactly, without changing exact 0 or 1 values before clipping. Every patient CSV includes fitted, perturbed and used probabilities. Clipping can introduce bias; its incidence is displayed.

If there are no training data, a declared initial survival probability supplies an exponential fallback. It is not represented as a learned estimate.

## 6. Explicit e-process construction and proof

The engine uses a finite, fixed mixture of linear betting martingales. This is a transparent bounded-score construction, not the exact PIT/isotonic algorithm of Arnold–Henzi–Ziegel.

Functions h are fixed before simulation: 1 and four indicator functions on [0,.25), [.25,.5), [.5,.75), [.75,1].

For the full and naive scores, ψ∈[-1,1]. For oracle and clipped plug-in scores, ψ∈[-1,1/g], where g=min(g_min,ε). The oracle bound is conservative when g_min<actual G. Both IPCW methods use the same declared conservative betting bounds for a fair comparison. Without censoring all methods use g=1 and coincide exactly.

The positive bets are

$$
\lambda_+\in\{.002,.006,.02,.06,.15,.35,.65,.9\};
$$

negative bets are −g times the same set. Because 0≤h≤1, all factors 1+λh(p)ψ are strictly positive.

For each fixed start s, h and λ,

$$
M_{n,h,\lambda,s}
=\prod_{i=s+1}^n(1+\lambda h(p_i)\psi_i),\qquad M_{n\le s}=1.
$$

If E[h(p_i)ψ_i|F_{i-1}]=0, then

$$
\mathbb E[M_n\mid\mathcal F_{n-1}]
=M_{n-1}\mathbb E[1+\lambda h(p_n)\psi_n\mid\mathcal F_{n-1}]
=M_{n-1}.
$$

The fixed uniform mixture over starts, channels and bets is a nonnegative martingale with E_0=1. Starts are either {0} or {0,floor(N/4),floor(N/2),floor(3N/4)}, chosen before outcomes.

Under H0, the full score is centered. The oracle score is centered under H0 plus conditional independent censoring and positivity, by iterated expectation. The naive score under censoring and the estimated-G plug-in score generally are not.

Ville's inequality gives, for a procedure satisfying the assumptions,

$$
P_{H_0}\left(\sup_n E_n\ge1/\alpha\right)\le\alpha.
$$

The reported anytime p value is min(1,1/max_{j≤n}E_j). **For the plug-in and naive procedures this transformation is only a numerical diagnostic unless their centering conditions hold.**

Log-space accumulation prevents overflow. First-alarm indices and maximum evidence are updated at every patient, independently of display thinning.

### Multiplicity and optional exploration

The mixture handles its own fixed h channels and starts. It does not adjust across four separate procedures, different experiments, selected seeds, model changes, horizons, or post-hoc parameter exploration. Each procedure has its own threshold 1/α. No global level-α claim is made for selecting any displayed alarm.

## 7. Descriptive statistics

Calibration curves use fixed bins in p and Horvitz–Thompson means of Y, R, R/G* or R/Ĝ. Estimates are not clipped into [0,1]. S* is plotted as a separate synthetic truth benchmark. Bin ECE is the bin-frequency-weighted absolute difference between the mean outcome estimator and mean prediction; it is not an anytime-valid test.

For survival probability p at τ, IPCW Brier contributions are

$$
d_T\frac{p^2}{G(U-\mid X)}
+R\frac{(1-p)^2}{G(\tau\mid X)}.
$$

The event term uses G(T−); using only G(τ), or squaring the IPCW pseudo-outcome, would compute a different quantity. Both true-G and fitted-G versions are available.

ESS is a descriptive Kish index for the survival contributions w=R/G:

$$
ESS=\frac{(\sum w)^2}{\sum w^2}.
$$

It is not an effective sample size for all clinical outcomes or a replacement for an IPCW variance calculation. The full and naive unweighted rows have ESS=n by convention.

## 8. Conservative simultaneous band

For the oracle ψ∈[-1,1/g_min], let B=1+1/g_min. Without censoring B=2. Conditional Hoeffding with

$$
\alpha_n=\frac{6\alpha}{\pi^2 n^2},
\qquad b_n=B\sqrt{\frac{\log(2/\alpha_n)}{2n}}
$$

and the union bound gives simultaneous coverage of the average conditional expectations by average(ψ)±b_n. Under H0 this target is zero. The band is conservative and does not address unknown-G error. It is disabled when conditional independence is violated.

The band's α and the e-process's α are separate guarantees, not a joint level-α decision rule.

## 9. Paired Monte-Carlo

Every replicate uses a distinct deterministic seed derived from the base seed; all procedures share its patients. The valid-null arm sets all predictive-error coefficients and ρ to zero, retaining population shift, censoring drift and nuisance-estimation settings. The current arm uses the selected configuration.

Outcomes:

- Probability of at least one first alarm during the entire follow-up, per procedure.
- Wilson 95% intervals for these Bernoulli frequencies.
- First alarms before/at change versus first alarms after change.
- Median and quartiles of detection delay conditional on a first post-change alarm.
- Individual first-alarm indices, including null for non-detection, in the exported replicate CSV.

If initialShift is nonzero, the alternative is present from the start and delay is measured from index zero. Otherwise it is measured from the configured change index. The interface warns that power based on any alarm includes early alarms. Wilson intervals quantify Monte-Carlo error, not uncertainty in a clinical population.

## 10. Exports and auditing

Patient CSV contains the entire generated cohort, even when the replay clock shows an earlier prefix. Latent variables are clearly named; infinity is represented by an empty censor-time field when censoring is disabled.

Trajectory CSV contains every contribution, score, natural log evidence and running-maximum inverse evidence. The JSON records engine version, configuration and whole-cohort summary. HTML reports record the current clock, complete configuration, active plotted period and current Monte-Carlo protocol, with inline SVG figures. Their print button supports browser PDF saving.

Local checkpoints are browser-local and can be exported. Share links encode configuration only, never patient data. Changing engine version can change seeded results; retain version information with experiments.

## 11. References consulted

1. Arnold, S., Henzi, A. & Ziegel, J. F. (2023). *Sequentially valid tests for forecast calibration.* Annals of Applied Statistics, 17(3), 1909–1935. https://arxiv.org/abs/2109.11761
2. pec documentation. *Estimation of censoring probabilities.* https://search.r-project.org/CRAN/refmans/pec/html/ipcw.html
3. Kvamme, H. & Borgan, Ø. *The Brier Score under Administrative Censoring: Problems and Solutions.* https://arxiv.org/abs/1912.08581

## Validation limits

The separate [simple-remedy audit](AUDIT_METHODS.md) extends these checks with 13 methods, augmented IPCW, predictable betting bounds and a restricted parametric censoring-confidence envelope. Its [confirmation results](AUDIT_RESULTS.md) use a distinct fixed protocol; the original monitor above is unchanged.

Numerical identities, bounds, censoring likelihood fits, temporal integrity, deterministic reproduction and worker/Monte-Carlo aggregation have automated checks. The conditional exponential fit was additionally compared to an independent SciPy optimizer.

Browser rendering and PNG download behavior require visual/browser verification. This development environment did not provide the browser-control capability required for that QA path; no claim of completed cross-browser visual testing is made.

