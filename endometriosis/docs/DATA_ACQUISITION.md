# Data acquisition and provenance checklist

No patient-level data is bundled. Publication catalogue verification date: 2026-10-11. Dataset availability, permissions, processed matrices and donor overlap still require acquisition work.

| Resource | Verified pointer | Present locally | Independence concern |
|---|---|---|---|
| Fonseca 2023 | PMID 36624343; BioProject PRJNA879764; lawrenson-lab/AtlasEndometriosis | Metadata only | Original donors reused by integrated atlases |
| HECA 2024 | PMID 39198675; DOI 10.1038/s41588-024-01873-w | Metadata only | Integrates published studies including Fonseca |
| GWAS 2023 | PMID 36914876 | Metadata only | Possible overlap with later meta-analyses |
| GWAS 2026 | PMID 42056605 | Metadata only | Original cohorts must be mapped |
| Atlas / AI 2026 | PMID 42161907 | Abstract metadata only | Donor origins and access need review |

## Acquisition manifest to create per dataset

- Original study, accession, release and retrieval date.
- Exact remote file and SHA-256 checksum after retrieval.
- License, terms, redistribution restrictions and approval status.
- Raw versus normalized expression; count units; gene identifiers and genome build.
- Original donor/cohort mappings and overlap with all other sources.
- Tissue site, diagnosis definition, cycle phase, treatments, age, ancestry and missingness.
- Cell annotations, QC procedure and biological versus technical replicate identifiers.

Do not count a reanalysed public donor as a new validation donor. Do not publish identifiable clinical data to a public GitHub repository. The local browser importer needs summary statistics, not names, clinical identifiers or individual medical histories.

## Preparing input

Aggregate integer counts within original donor × cell type. For this baseline, choose one tissue per analysis and require consistent donor metadata. Include explicit zeros and the full measured gene universe before prespecified low-count filtering. Preserve independently interpretable cohort labels. Unknown phase/treatment information limits interpretation; encoding `unknown` is not correction for missing confounding.

Inspect cell quality and annotation stability upstream. The current software does not substitute for single-cell preprocessing or a controlled cohort design.
