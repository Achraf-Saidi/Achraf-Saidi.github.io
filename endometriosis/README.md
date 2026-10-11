# EndoScope — Endometriosis Research Observatory

Research software by Achraf Saidi. Static interface for GitHub Pages, a sourced publication graph, and an exploratory donor-level statistical pipeline.

**Version 0.1 is research infrastructure, not a therapeutic discovery.** No endometriosis cohort has been reanalysed, no gene target validated, no clinical effectiveness measured, and no novelty established. Published atlas numbers are catalogued metadata; simulations are explicitly artificial.

## Open the interface

GitHub Pages: https://achraf-saidi.github.io/endometriosis/

The interface uses local HTML/CSS/JavaScript, with no CDN, login, trackers or external runtime dependency. Navigation, filtering, graph inspection, CSV import, forest plots, BH adjustments, descriptive fixed-effect pooling, heterogeneity and leave-one-study-out analyses work in the browser. Files imported there stay in memory and are not uploaded.

Serve this directory through any static HTTP server. `index.html` is the entry point. The publication catalogue has no measured expression data or UMAP.

## Run reproducibly

From this directory, with Python 3.10+ and Node 18+:

```bash
python -m pip install -r research/requirements.txt
python research/simulate.py --output generated --seed 20261011 --repetitions 500
python research/pipeline.py --counts generated/synthetic_counts.csv --output generated/analysis --data-status synthetic
python -m unittest discover -s tests -p 'test_*.py'
node --test tests/stats.test.cjs
```

`generated/analysis/summary.csv` can be imported into the interface. It contains **synthetic**, not patient-derived, values. The same CLI accepts properly audited real aggregate counts with `--data-status research`.

Expected raw aggregate input columns:

```text
gene,study,cohort,donor,cell_type,condition,count,tissue,phase,batch,hormone
```

Counts must be nonnegative integers, a complete gene × donor grid, and already pseudobulked per donor/cell type. Include explicit zeros. Only one tissue contrast per run is supported. Phase, batch and hormone are categorical covariates. Disease/covariate collinearity, duplicate counts, repeated/inconsistent donor metadata and degenerate models are rejected.

For study summaries, the browser contract is:

```text
gene,study,cohort,cell_type,effect,se,p_value,n_case,n_control,effect_scale,contrast
```

Provide all tested genes, not selected hits. Cohort labels cannot establish independence without an external donor audit. Pairing, longitudinal measurements and heterogeneous tissue contrasts require other models.

## Scientific documentation

- [Methods, equations and limitations](docs/METHODS.md)
- [Research protocol and novelty assessment](docs/RESEARCH_PROTOCOL.md)
- [Data acquisition and provenance](docs/DATA_ACQUISITION.md)
- [Executed synthetic benchmark](research/benchmark.json)

The common-effect browser meta-analysis and Python HC3 log-CPM model are exploratory baselines. Compare them to established count-based pseudobulk methods before biological inference. The “passes filters” field is not a causal claim, probability of efficacy or treatment advice.

## Current boundaries

Implemented: interface, manually curated catalogue, study-level graph, aggregate-count analysis, simulation, summary import, statistical diagnostics, exports and tests.

Not implemented: raw sequencing acquisition and preprocessing, real cell embeddings, automated systematic review, fine-mapping/colocalisation, ligand–receptor inference, perturbation prediction, validated drug ranking, clinical model, laboratory experiments or clinical trial. These require further data, method validation and specialist partnerships.

## Attribution and rights

Original code copyright 2026 Achraf Saidi. No third-party patient dataset is redistributed. Publication metadata links to original authors and data providers; consult each dataset’s permissions before reuse. The bundled synthetic data generator and simulated report are created for this project.
