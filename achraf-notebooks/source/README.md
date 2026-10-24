# Achraf Notebooks

An independent, free, bilingual learning library for mathematics, statistics, programming,
data science and AI. **By Achraf Saidi.** No account, subscription or accredited degree.

Live: https://achraf-saidi.github.io/achraf-notebooks/
Source: https://github.com/Achraf-Saidi/Achraf-Saidi.github.io/tree/main/achraf-notebooks/source

This foundation includes 12 original lessons in French/English, five mathematical
experiments, a diagnostic, search, glossary, local progress/bookmarks/notes, export/import,
and Python/R code labs loaded on demand. Four downloadable reference experiments include
real Iris/Wine datasets and synthetic optimization/gradient checks. The 136-module
curriculum is a roadmap, not 136 completed courses. No independent scientific review
is claimed for the initial lessons.

## Develop and verify

From this source directory, with Node 22+:

```sh
npm ci
npm run dev
npm run verify
```

The local site is under /achraf-notebooks/fr/. npm run verify performs Astro type checks,
unit/content tests, static build, Pagefind indexing and built-route/link/math checks.

Python reference experiments:

```sh
python -m pip install -r projects/requirements.txt
python projects/iris.py
python projects/wine.py
python projects/gradient.py
python projects/backprop.py
```

Iris and Wine are bundled in scikit-learn once installed. Data is not redistributed here;
see project briefs for provenance, dictionary and licence links. Results were recorded
with numpy 2.3.5 and scikit-learn 1.8.0.

## Publication in the existing Pages repository

This editable project is stored in achraf-notebooks/source/. Running `npm run build`
creates source/dist/. Copy its contents to the parent achraf-notebooks/ directory while
preserving source/, then commit only this project's files. The existing branch-based
GitHub Pages build deploys them. The added Achraf Notebooks verification workflow runs
on source changes without replacing existing project workflows or serving settings.
Use a fresh checkout and inspect diffs before committing generated assets.

A future dedicated repository can place this source at root and use Astro's official
GitHub Pages Actions guide: https://docs.astro.build/en/guides/deploy/github/ . Set `site`
and `base` appropriately. Do not replace the umbrella repository's deployment unilaterally.

See docs/AUTHORING.md, docs/ARCHITECTURE.md, docs/IMPLEMENTATION.md and
curriculum/manifest.json. Code: MIT. Original teaching prose: CC BY 4.0. Third-party assets
retain their own licences; see THIRD-PARTY-NOTICES.md.

## AI mastery expansion — 2026-10-24

The public /achraf-notebooks/mastery/fr/ and /mastery/en/ routes complement the original 12 Starlight lessons. They present the existing 136-module prerequisite roadmap, 26 curated public lectures or books, seven original bilingual mathematical chapters (PCA, Bayes/MCMC, backpropagation, attention, Bellman/RL, censoring/calibration, and multi-omics/GNN), solved exercises, NumPy code, search, local progress and personal notes. **Planned modules remain planned**; the site never claims 136 completed courses.

The mastery pages are committed twice: as immediately served static GitHub Pages artifacts under `achraf-notebooks/mastery/`, and as durable source files under `achraf-notebooks/source/public/mastery/`. Future Astro builds copy the public assets into the final deployment. Source home and curriculum pages link to this section; do not remove these links when rebuilding. Follow official external course pages for their current access terms. This addition has not been independently peer reviewed or browser-tested end to end.

## Expanded AI Academy (24 October 2026)

The `/achraf-notebooks/academy/fr/` and `/en/` pages expose all 136 curriculum modules as independent study workspaces. Each maps topic progression, learning outcomes, prerequisite/dependent links, school-specific official free educational resources and local study notes. **23 modules have original mathematical exposition, derivations, Python examples and solved exercises in French and English**; the remaining 113 are structured study plans, not falsely labeled finished textbook chapters.

The Academy's self-contained source lives in `source/public/academy/`, with a served mirror in `achraf-notebooks/academy/`. This avoids dependence on an external server and preserves content across Astro builds. Sources such as Stanford, MIT and Harvard are linked rather than copied, subject to each provider's licenses. The new academic material is an original draft without independent scientific peer review.
