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

## Robotics + Embodied AI expansion — 2026-10-26

The **current** curriculum now comprises **13 schools and 151 planned modules**, including a new School M of 15 modules covering robot physics and safety, 2D/3D transforms, 2R kinematics and inverse kinematics, differential kinematics, PID/LQR/MPC, Kalman filtering, mapping/SLAM, A*, ROS 2 and Gazebo, robot vision, grasping/contact, imitation learning and RL, embedded hardware, embodied/VLA systems, and a staged simulated/mobile-robot capstone.

All 15 School M modules include **original bilingual authored explanations, Python snippets and worked exercises** via `academy/{fr,en}/content-4..7.js`. The academy now has **38 expanded modules out of 151**; the other **113** are clearly flagged as structured study plans rather than complete textbooks. Original SVG labs in `academy/{fr,en}/visuals.js` visualize a two-link arm, singularities, PD control, sensor fusion, grid A* and additional concepts. The new `robotics/{fr,en}/` hub contains original editable SVG schematics and links to all 15 modules.

Pedagogy is independently written, with links to publicly accessible university notes (Stanford CS223A, MIT Underactuated Robotics, MIT Manipulation, Northwestern Modern Robotics) and PythonRobotics (MIT-licensed code). **Do not copy third-party course text, illustrations or videos without checking each license**, even when the material is free to read. The demonstrations have not undergone an independent scientific or hardware-safety review. Robot lab code is for simulation, and none of the material certifies physical systems.

## AI Academy update — 27 October 2026

The Academy contains 151 mapped modules across 13 schools. **50 modules** now offer original bilingual explanations, mathematical derivations, runnable Python code, worked exercises and references, while **101 modules** remain planned outlines (not completed textbook chapters). `content-9.js` adds scientific NumPy, CNNs, tiny-GPT training, offline RL and imitation, computer vision, and experimental reproducibility. `visuals-3.js` adds interactive visualizations of matrix conditioning, cross-correlations, causal attention masks, IoU, and sequential imitation bias. Licensed or publicly accessible university teaching resources are linked, not copied. These educational simulations are not validated for actual clinical or robot deployment.
