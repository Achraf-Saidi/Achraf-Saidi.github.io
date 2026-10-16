# Content, notation and bilingual editorial guide

Each lesson is MDX in src/content/docs/{fr,en}/<section>/<slug>.mdx. The equivalent
concept keeps the same route after the locale prefix and the same conceptId.
Published-lesson inventory lives in curriculum/lessons.json; full planned scope in
curriculum/manifest.json. Update both language files and the inventory together.

Required frontmatter: title, description, conceptId, effort (minutes), prerequisites,
status. Stable IDs have module plus local lesson number, e.g. A9.01. A lesson completing
one concept does not mark the entire parent module as complete.

Required progression: motivating question; explicit outcomes and linked prerequisites;
intuition; definitions and assumptions; defined symbols; derived result; hand calculation;
relevant visualization; transparent code; professional implementation if useful;
exercises with hints and reasoned solutions; limitations; future connections; sources.
History belongs where it explains the problem's development. Verify attribution with
original publications; do not force an invented historical anecdote into every topic.

Notation: italic lower-case scalars; define vector/matrix shapes explicitly; distinguish
population probability from sample proportions, equality from approximation, training
loss from generalization. Define every index and parameter. State domains and denominators
that must be nonzero. Each formula should have an explanatory sentence.

Use $...$ and $$...$$ for KaTeX. Keep wide displays scrollable. Use standard code fences
with language labels. Import components from the relevant relative src/components path.
Lab's kinds: derivative, bayes, matrix, gradient, backprop. Quiz currently supports a
single-choice index or numeric answer with tolerance. CodeLab supports Python and R.

Translation review must preserve hypotheses, numerical outputs, exercise answers, units
and scope. Code may use English identifiers in both versions. Distinguish translated
lesson prose from the currently English technical inventory for planned modules.

Statuses: planned → in-development → draft → technically-validated. Independently record
scientific review (reviewer/date/scope) when it happens. Publication is a release decision,
not evidence of independent review. Initial lessons are published, scientificReview=false.

Cite author, title, year and exact source link where applicable. Registry metadata is in
curriculum/references.json. Sources are intellectual references, not reusable copied text.
State dataset access, provenance, units, version, licence and split protocol. Never infer
clinical availability or approval from a research dataset's public landing page.
