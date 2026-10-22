# AION — Human Digital Twin Laboratory

**AION** is an interactive, fully static, browser-side *clinical research prototype* for exploring organ-level clinical cohorts, statistical analogues, time-to-event models and hypothetical measurement perturbations.

**Public page (when GitHub Pages publishes the repository):** https://achraf-saidi.github.io/aion/

> [!IMPORTANT]
> Not a medical device, digital diagnosis system, individual survival predictor or validated multi-organ digital twin. All medically relevant results are exploratory. Do not use AION to change medicines or make treatment decisions.

## What actually works

- Seven responsive dashboard views: Command Center, Organ Atlas, Latent Explorer, What-if Laboratory, Survival Studio, ML Diagnostics, Research & Data.
- Edit 22 de-identified personal measurements in a local, in-memory profile; load one-row CSV files using the same variable names.
- Read three **actual publicly available** UCI clinical cohorts from same-origin static CSV files.
- Reproducibly train two L2-regularized logistic classifiers **in the browser** for liver-disease and CKD cohort labels.
- Compute 75/25 fixed-seed, stratified, internal holdout AUC, Brier score, 8-bin ECE, ROC, reliability diagram, score distributions, confusion matrix.
- Fit a Cox proportional hazards model to heart-failure data and report holdout concordance. Follow-up time and censoring status are handled as outcomes, **not used as baseline predictors**.
- Show observed Kaplan–Meier curves, Cox research curves, Breslow cumulative hazard and standardized coefficients.
- Build separate PCA latent spaces for each source cohort and find k-nearest clinical neighbors by median-imputed standardized Euclidean distance.
- Live scenario sliders, preset perturbations and side-by-side association comparisons.
- Medication selection placeholder **does not change model outputs**; effects are not identifiable from these source datasets.
- Local JSON export of currently entered analysis. No auth, server-side records, localStorage, paid AI APIs, CDN charts or tracking code.

## Three evidence-backed modules

| Module | Rows | Source | Endpoint | Model |
| --- | ---: | --- | --- | --- |
| Heart | 299 | UCI Heart Failure Clinical Records (ID 519) | time to death/censoring in **patients with existing heart failure** | Cox PH + Kaplan–Meier |
| Liver | 583 | UCI Indian Liver Patient Dataset (ID 225) | cohort liver disease label | L2 logistic classifier |
| Kidney | 400 | UCI Chronic Kidney Disease (ID 336) | cohort CKD case label | L2 logistic classifier |

These are **unlinked independent datasets**, so a single multi-organ latent representation of the **same people** is impossible to reconstruct from this evidence. AION instead exposes honest **organ-specific** latent spaces.

**Illustrative-only organ cards:** stomach/GI symptom intensity, lung SpO2/smoking proxy and metabolic BMI/glucose proxy. These are explicit heuristics, not trained or validated disease, toxicity or survival models.

### Reproducible in-browser diagnostics (fixed-seed internal holdout)

| Metric | Liver | Kidney |
| --- | ---: | ---: |
| ROC AUC | ~0.725 | ~0.990 |
| Brier score | ~0.180 | ~0.061 |
| ECE (8 equal bins) | ~0.059 | ~0.108 |

The heart-failure Cox research model's internal holdout C-index is ~0.722. These figures were computed using the repository's actual CSV files and JS modeling code. They are **not external validation** or a claim of clinical utility. Scores and metrics may change if data or preprocessing are edited.

## Repository layout

- \`index.html\` — accessible static app shell and seven workspaces
- \`style.css\` — responsive dark UI and animated schematic
- \`app.js\` — data parsing, training, survival analysis, PCA, SVG graph engine, subject editing, scenarios, JSON export
- \`data/heart-failure.csv\` — source clinical records
- \`data/liver-ilpd.csv\` — source ILPD records
- \`data/kidney-ckd.csv\` — source chronic kidney records

## Run

Use the live GitHub Pages URL or serve the repository directory via a static web server:

\`\`\`bash
cd aion
python -m http.server 8080
# open http://localhost:8080/
\`\`\`

Opening \`index.html\` via \`file://\` will block same-origin CSV fetches in many browsers.

### Local profile CSV format

Put header names matching JavaScript state fields and a single row of values. For example:

\`\`\`csv
age,sex,sbp,dbp,bmi,ef,creatinine,sodium,hemoglobin,glucose,urea,bilirubin,alt,ast,alp,albumin,agRatio,spo2,giSymptoms
36,1,122,78,24.1,60,0.94,139,14.7,91,29,0.7,23,21,87,4.3,1.4,98,1
\`\`\`

Values are never automatically persisted. Exported JSON files contain the entered profile; protect them like health data.

## Methods and caveats

1. **Predictive ≠ causal:** changing a laboratory feature and observing a model response does not show how a medication or behavior would modify a person's health.
2. **Sampling:** heart-failure patients are a small, selected group; in particular the Cox model is not applicable to a healthy person. Liver and CKD cohorts are small, narrow and not necessarily representative of the general population.
3. **Missingness:** kidney missing continuous variables use training-only median imputation. A heuristic hypertension history derived from present systolic blood pressure is a proxy mismatch and requires explicit measurement for rigorous studies.
4. **Validation:** fixed-seed holdout testing is useful for demonstration, not enough to establish calibration, generalization, bias, clinical decision thresholds or safety.
5. **Uncertainty:** confidence intervals, external calibration tests, longitudinal physiological state inference, external validation, correlated joint organ dynamics, real gastric model and medication causal effects are not implemented.
6. **Security:** this is not an encrypted EHR platform. Github Pages serves static resources; profile calculations run in browser memory but the public app code and public cohort datasets remain public. No identifiable personal health data should be committed to GitHub.

## Original datasets, references and attribution

All three UCI datasets are distributed under **CC BY 4.0**; credit must be retained.

- **Heart Failure Clinical Records** — UCI Machine Learning Repository, DOI [10.24432/C5Z89R](https://doi.org/10.24432/C5Z89R); Chicco & Jurman (2020), *Machine learning can predict survival of patients with heart failure from serum creatinine and ejection fraction alone.* Clinical CSV was retrieved from the public GitHub mirror \`yvmeli/heart_failure_clinical_records\`.
- **Indian Liver Patient Dataset** — Ramana, B. & Venkateswarlu, N., UCI Machine Learning Repository, DOI [10.24432/C5D02C](https://doi.org/10.24432/C5D02C). Clinical CSV was retrieved from public GitHub mirror \`mikeizbicki/datasets\`.
- **Chronic Kidney Disease** — Rubini, L., Soundarapandian, P. & Eswaran, P. (2015), UCI Machine Learning Repository, DOI [10.24432/C5G020](https://doi.org/10.24432/C5G020). Clinical CSV was retrieved from public GitHub mirror \`vamshikrishnajr/chronic-kidney-disease-diagnosis\`.

## Publication and next phases

This static app was added in an isolated \`aion/\` folder within the user's existing GitHub Pages site repository and **does not overwrite the existing portfolio**. If Pages is configured to publish main/root, it will expose \`/aion/\` automatically once deployment finishes.

The research roadmap is **linked longitudinal biomarker data → joint latent state inference → uncertainty & calibration under censoring → validated predictive checks → causal / mechanistic treatment models where justified → clinician-led evaluation**.
