# Architecture and decisions

Astro 5 + Starlight + MDX + TypeScript was retained from the brief. Starlight supplies
hierarchical navigation, locale-aware equivalent-page links, light/dark modes, mobile
navigation, math-compatible content and Pagefind static full-text search. Astro builds
HTML; no application server or paid API is needed. KaTeX runs at build time and fonts
are served locally. Mathematical lab SVGs are generated from deterministic tiny models.

Two registries separate module scope (136 planned modules) from actual published lesson
content (12 concepts, 24 language versions). The module prerequisite graph is acyclic.
The roadmap exposes linked prerequisites; no planned module impersonates a full lesson.

The existing owner-controlled GitHub Pages umbrella repository already hosts separate
projects. Available connector tools cannot create a new repository. This edition is
isolated to achraf-notebooks/ and a new scoped verification workflow; existing sites,
root home page and workflows are preserved. Compiled static output lives directly under
achraf-notebooks/. Its editable Astro project is achraf-notebooks/source/ on GitHub.
This separation allows current branch-based Pages deployment without changing the
umbrella site's serving configuration. Existing Pages deployment produces live evidence.

When moved to a dedicated repository, source/ can become repository root. Configure
Pages Actions and the same /achraf-notebooks base for that repository. BASE_PATH is
supported for generated components; editorial absolute links currently use the public
/achraf-notebooks prefix and must be migrated together for a different deployment path.

Client progress uses localStorage (versioned, validated JSON import, explicit export).
No cross-device sync or backend is implied. Notes are inserted as text, never HTML.
Code labs create module workers on first explicit execution. Python Pyodide 0.27.7 and
webR 0.4.4 are pinned, lazy CDN downloads. Stop terminates the worker. Heavy models and
unsupported packages belong in downloadable notebooks. SQL WASM is planned, not shipped.

Accessibility is designed in: landmarks, visible focus, reduced motion, labelled inputs,
text outputs for plots, no colour-only meaning. A full WCAG audit and device testing
remain outstanding. No measured Lighthouse scores are claimed.
