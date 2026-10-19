# Survival Calibration Lab

A browser-local research workbench by **Achraf Saidi** for fixed-horizon sequential survival calibration under right censoring.

**Open:** https://achraf-saidi.github.io/research/calibration-lab/

The interface is in French. All data are synthetic; nothing is uploaded. This first implementation uses an explicitly known logistic survival rule and a Weibull event-time generator to isolate calibration, censoring and nuisance estimation.

## What is implemented

- Regular or Poisson patient arrivals, a calendar replay, a fixed assessment delay τ and an auditable patient register.
- A model calibrated by construction, baseline or delayed miscalibration, slope and group effects, gradual transitions and covariate/population shift.
- Conditional right censoring, time-varying censoring, a positivity bound and an optional conditional-independence violation via a Gaussian copula.
- Paired full-data, censoring-ignored, true-G IPCW and estimated-G IPCW scores.
- Learned censoring models: reverse Kaplan–Meier, stratified reverse KM and a conditional exponential likelihood fit.
- Independent historical training and frozen, expanding or rolling training; every current patient is scored before joining training.
- Perturbation of fitted G, weight clipping, a bias decomposition, risk-bin calibration, correct event-time-weighted Brier scores, censoring diagnostics and contribution ESS.
- An explicit finite mixture of bounded-score test martingales with fixed risk channels, two-sided bets and optional delayed starts.
- A conservative simultaneous Hoeffding band for the oracle score, with its assumptions stated.
- Worker-based paired Monte-Carlo: valid-null and current-scenario arms, Wilson intervals, early alarms, post-change detection and conditional delay.
- Individual SVG and PNG exports, complete patient and trajectory CSV, importable configuration JSON, reproducible URL, self-contained HTML reports and six local experiment checkpoints.

## Scientific scope

This is **a simulation workbench**, not a solution to calibration monitoring with unknown censoring. A plug-in censoring estimator is not automatically anytime-valid. No claim of exact reproduction of an earlier experiment or of the Arnold–Henzi–Ziegel PIT/isotonic procedure is made.

Each procedure has its own level α. Looking across four procedures, many datasets, horizons or interactively selected configurations is not a single level-α test.

Read [METHODS.md](METHODS.md) and the in-app **Méthode** tab for the definitions, proof and limitations. The source doctoral PDF and unpublished prior results are not included in the public repository.

## Files

| File | Role |
| --- | --- |
| index.html / style.css | Accessible responsive interface and statistical explanations |
| engine.mjs | Pure seeded generator, observed-data censoring fits, scores, martingale mixture, diagnostics |
| worker.mjs | Background simulation and paired Monte-Carlo |
| charts.mjs | Native SVG charts and self-contained SVG / PNG downloads |
| app.mjs | Controls, replay, diagnostics, storage and exports |
| tests/engine.test.mjs | Statistical identities, bounds, temporal integrity and numerical tests |
| tests/worker.test.mjs | Worker transport and Monte-Carlo aggregation |
| tests/validate.mjs | Reproducible repeated-simulation validation |
| tests/validation.json | Results from the documented validation run |

## Run and test

No build, package install, API key or CDN is needed. GitHub Pages serves these files directly.

For local use, serve the repository root over HTTP, then visit /research/calibration-lab/. Module workers require HTTP(S).

Node 20+ is sufficient for the numerical checks:

    node --test research/calibration-lab/tests/engine.test.mjs research/calibration-lab/tests/worker.test.mjs
    node research/calibration-lab/tests/validate.mjs 200

A separate SciPy optimization check was used during implementation to compare the conditional exponential censoring fit with an independent optimizer. This does not introduce a runtime dependency.

## Reproducibility

The application has a fixed engine version and a seeded PRNG. The event cohort remains the same when censoring is switched on/off with the same other settings. Historical patients use a separate seeded stream; arrival intervals use a third stream. All four procedures are paired on exactly the same patients within a simulation.

Reproducibility is tied to engine version and configuration. Tiny floating-point differences across JavaScript engines are possible.

The page never treats an absence of alarm as proof of calibration and never labels a censored patient as having experienced the event.

