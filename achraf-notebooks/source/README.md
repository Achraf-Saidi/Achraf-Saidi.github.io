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
