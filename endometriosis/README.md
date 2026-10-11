# EndoScope — scientific endometriosis reanalysis

Research by Achraf Saidi. The priority is now the **executed biological analysis**, not the website.

## Read the actual results

- [French scientific report](results/BIOLOGICAL_REPORT_FR.md)
- [Full 13,827-gene results (gzip CSV)](results/all_genes.csv.gz)
- [Cohort audit and computed results](results/biological_results.json)
- [Input provenance and SHA-256 checksums](results/acquisition_manifest.json)
- [Scientific figure](results/paired_anatomy_figure.svg)
- [Analysis plan frozen before inspecting gene effects](research/BIOLOGICAL_ANALYSIS_PLAN.md)

**Two original public cohorts were analysed:** GSE105764, 8 paired ovarian lesion/eutopic RNA-seq donors; GSE86534, 4 microarray donors with lesion, eutopic and adjacent ovarian tissues. These are affected donors, not a disease-versus-healthy design.

The primary model-dependent directional conjunction finds **zero replicated genes after BH at 5%**. Directions correlate across cohorts (Spearman rho approximately 0.625), but this does not validate individual genes. Within the array cohort, lesion/eutopic and adjacent-ovary/eutopic effects correlate approximately 0.803, motivating careful anatomical and cell-composition controls. No cure, causal target, clinical efficacy or novel method is claimed.

The four-donor exact sign-flip sensitivity has a two-sided p-value floor of 0.125. It cannot confirm a 5% replicated gene claim even without multiplicity. Non-significance is not tissue equivalence or absence of disease biology.

GSE135485 was excluded because downloaded original sample metadata did not resolve individual tissues and donor pairing. InMoose's documented robust empirical-Bayes option was attempted but not implemented in its installed Python port; [the blocker is recorded](results/moderation_status.json). No silent positive-seeking fallback was used.

## Reproduce the biological work

From this directory, Python 3.10+:

```bash
python -m pip install -r results/requirements_executed.txt
python research/biological_analysis.py --data /path/to/geo_downloads --output results
python research/plot_biological_results.py --results results
python research/write_biological_report.py --results results
python -m unittest discover -s tests -p 'test_*.py'
node --test tests/stats.test.cjs
```

The downloader retrieves original GEO matrices/metadata and official HGNC annotation. Exact file checksums are recorded. `requirements_executed.txt` records versions used for the primary analysis and plotting. Version hashes, pairing assumptions, exclusions and limits are in the report. Individual paired-difference matrices are generated locally for checking and plotting but original patient-data source files are not redistributed.

The biological script is separate from the older browser laboratory: **do not use the browser common-effect pooling on these RNA/array effects**, which have different measurement scales. Read the full result family rather than the top100 descriptive preview. Selection and thresholds are not validated target rankings.

## Previous infrastructure

The static website remains available at https://achraf-saidi.github.io/endometriosis/ and includes a catalogue, bibliographic graph and local CSV laboratory. It is supporting infrastructure, not the scientific result. The older [methods](docs/METHODS.md), [protocol](docs/RESEARCH_PROTOCOL.md), [synthetic benchmark](research/benchmark.json) and donor-level exploratory baseline remain documented; synthetic outputs are distinct from the real biological analysis.

## What is still required

Independent, adequately powered and well-annotated donor cohorts; cell-type/site-aware analysis; validated count/microarray modelling; biological specialist review; perturbation experiments; separate clinical validation for any therapeutic claim. The report defines the next experimentally informative question and makes no promise of efficacy.

Original code copyright 2026 Achraf Saidi. Attribute the original GEO depositors and consult each source's terms. No patient identity or clinical recommendation is provided.
