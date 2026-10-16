# Research sources and verification record

Checked 16 October 2026. The machine-readable bibliography is `curriculum/references.json`; all references include French and English descriptions and stable IDs. These are sources to cite, not copied teaching material. Bibliographic titles remain available in `citationTitle`; translated display titles do not replace the original citation.

## What was checked

Official university pages, maintainer documentation, original publisher proceedings and original research articles were retrieved through web search and page retrieval. The registry records the date and retrieval reference for each check. Public access was checked separately from permission to redistribute. A successful web-page check does not certify that every embedded video plays in every region, or that an external URL will remain valid indefinitely. No video timestamps have been invented.

The history bibliography includes McCulloch and Pitts (1943), Rosenblatt (1958), Rumelhart, Hinton and Williams (1986), AlexNet (2012) and the Transformer paper (2017). The 1986 paper is described as influential; this does not claim reverse-mode differentiation originated in 1986. MIT's linear algebra video collection was recorded in 1999 although its course page is labeled Spring 2010.

Core reference IDs include:

| Area | Stable IDs |
| --- | --- |
| Limits, derivatives and integrals | `mit-calculus` |
| Linear algebra | `mit-linear`, `video-mit-linear` |
| Probability | `harvard-stat110`, `video-stat110` |
| Classical statistics and ML | `isl`, `sklearn-guide` |
| Convex optimization | `convex-book` |
| Bayesian computation | `stan-guide` |
| Biology and experimental measurement | `ebi-functional-genomics-i`, `ebi-functional-genomics-ii` |
| Multi-omics integration | `mofa-2018`, `mofa-plus-2020`, `snf-2014`, `mofa-docs`, `ebi-multiomics-materials` |

The EMBL-EBI genomics tutorials are freely readable without registration; registration adds tracking. Their license notices specify CC BY 4.0 with exceptions for separately identified material. The 2026 multi-omics materials combine videos and practicals, and likewise require attention to item-level exceptions. They are linked as optional external learning references; Achraf Notebooks does not claim to have authored them.

## Multi-omics dataset candidate

[MOFAdata on Bioconductor](https://bioconductor.org/packages/release/data/experiment/html/MOFAdata.html) is a public processed-data candidate for the future multi-omics capstone. Its [official vignette](https://bioconductor.org/packages/release/data/experiment/vignettes/MOFAdata/inst/doc/MOFAdata.html) documents `CLL_data`: 200 patient columns with mRNA, methylation, drug-response and mutation views. Matrix orientation and sample alignment must be checked before integration. Drug response is an experimental phenotype, so it should not automatically be treated as interchangeable with a molecular omics assay.

The package metadata declares LGPL-3. This identifies the package license; authors must still inspect original study terms and item-level documentation before redistributing data. Public availability does not imply unrestricted use of all original clinical files. This investigation establishes a candidate and provenance trail; the capstone is still planned, with implementation, runtime measurements, exact preprocessing, study-level terms review and validation pending.

The source archive link was followed from the official Bioconductor package page. The web retriever received an archive content type it cannot render; it did not inspect or checksum the binary contents. Therefore the registry describes this as an official extracted download link, not a validated downloaded dataset. Install through `BiocManager::install("MOFAdata")` in a compatible pinned R/Bioconductor environment when implementing the project. Do not hardcode a release archive forever.

`scMT_data` is an alternative processed paired methylome/transcriptome example. Its assays have different observed cell counts, so `MultiAssayExperiment::sampleMap` must determine alignment rather than an assumption that columns coincide.

## Access and rights distinctions

| Source | Access observed | License/rights interpretation |
| --- | --- | --- |
| UCI Iris, Wine Quality and Bike Sharing | Public, no required account | Dataset pages explicitly identify CC BY 4.0; attribution and source citation are required. |
| Bioconductor MOFAdata | Public package | LGPL-3 package metadata; additionally inspect study-level provenance and terms. |
| Bioconductor airway | Public package | LGPL package metadata; RNA-seq only, not a multi-omics dataset. |
| GDC/TCGA | Mixed | High-level open files may require no authentication; controlled files require dbGaP authorization and eRA Commons authentication. Verify per file. |
| PhysioNet MIMIC-IV 3.1 | Credentialed | Required training and a signed DUA; unsuitable as a mandatory unrestricted core-course download. |

The [GDC access guide](https://gdc.cancer.gov/access-data/data-access-processes-and-tools) and [MIMIC-IV 3.1 page](https://physionet.org/content/mimiciv/3.1/) are the authoritative access references. GDC is a portal, not a single freely licensed dataset. Clinical prediction exercises must distinguish educational research prototypes from clinically validated systems.

## Manifest contract

`manifest.json` has `schools[]`, `modules[]`, `pathways[]` and an explicit `topologicalOrder`. Module IDs such as `A9`, `D16`, `G4` and `K10` are stable concept identifiers. Each module supplies bilingual `title`, `description`, `outcomes`, plus `topics`, `prerequisites`, `level`, `estimatedHours`, `references`, `tags` and `status`. Prerequisites refer to module IDs and must form a directed acyclic graph. Bibliography references refer to IDs in `references.json`.

The complete roadmap contains 12 schools, 136 planned modules and 293 prerequisite edges. Estimated hours are planning estimates including study and exercises; they are not measured completion times. Every roadmap module remains `planned`, even when a narrower published flagship lesson overlaps with some of its topics. Lesson publication status must be tracked separately. Outcome phrasing in this master manifest is an initial specification; lesson authors must refine it into assessable lesson-level outcomes before publication.

## Before publishing future research lessons

Check original papers and maintainer documentation again; verify exact dataset terms and file hashes; pin environments; retain sample/group/time splits; fit preprocessing inside training folds; report uncertainty and seed variation; audit missing views and batch effects; distinguish association from causation. Document each check actually completed. No independent scientific review is implied by this source discovery pass.
