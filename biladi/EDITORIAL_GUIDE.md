# BILADI — publishing a dossier

Preserve the existing brand and the GitHub Pages buildless deployment. This application has no backend and must not imply live bookings, transport schedules, payments or accounts.

## Knowledge model

`data/encyclopedia.json` contains individually authored French dossiers, editorial simplified readings, explicit typed edges, discovery trails and chronology entries. Existing multilingual articles remain in `data/editorial.json`. Identifiers are permanent URLs: never rename an identifier without adding a redirect.

A new dossier needs an identifier, title, domain, period, sorting year, lead, at least three substantial sections, sources with stable IDs, section references, an explicit simplified reading, an update date and its actual available languages. Add uncertainty notes where relevant. Do not label untranslated paragraphs as translations. Use a French availability notice for French dossiers; the interface has eight languages, but the new deep dossiers do not yet have eight translations.

Explicit relations must point to existing articles or culture profiles. Avoid linking by fuzzy title matching. A relation should have a defensible thematic, geographic or historical basis. Trails are ordered editorial paths, not travel routes. Chronology dates and uncertain ranges must remain explicit. Present-day administrative maps must not be labelled as historical boundaries.

`data/territories.json` holds the authored local dossiers. The first release covers fourteen territories; other wilayas retain their real photo, administrative dataset facts, map access and open inventory. A lack of authored material is not an invitation to fabricate local traditions, people or events.

## Images

Use identifiable, legally reusable images. `data/photos.json` records author, source file page, original URL, licence and licence URL, dimensions, size, retrieval date and alterations. Retain ShareAlike terms on derivatives. Commons identifies public-domain status by jurisdiction; preserve the file page that explains the rationale. An uploader is not necessarily the photographer.

Actual portraits may be used for biographies. Context photographs must be explicitly identified. An artwork is an artwork, a film still is a film still, and neither should be labelled a photograph of the historical event. Do not reproduce uncertain chronological claims from an upload description merely because the licence is valid. Obtain institutional/legal review for contested archives before reusing them. Never invent a historical image or attribute a generated scene to an archive.

Use WebP, correct intrinsic dimensions, descriptive alt text and an appropriate image width. The site presents local images and original file/credit links. No commercial music downloads, unlicensed scraped text or imaginary photographs.

## Sources and practical information

Write original prose. Cite factual claims and provide further reading. Separate primary documents, institutional summaries, scholarship and collective secondary sources. A commemoration is evidence about memory and may be less suitable for military chronology. Do not imply that all sources were fully examined just because a URL is linked.

For statistics, record observed year, release date, producer, unit, definition and geographic scope. Changes in administrative boundaries affect comparisons. Legal division in 2026: 69 wilayas, 1,541 communes; the law provides progressive transfer of prerogatives by 31 December 2026. Use JO 25 and JO 40 linked in the relevant dossier.

Travel costs, timings and suggested daily slots are assumptions, not verified fares or schedules. Confirm visa/access/guide conditions with authoritative providers. Keep the planner's buffer nights, summer Sahara exclusion, editable rates and uncertainty notices.

## Checks

Run `npm ci --ignore-scripts`, `npm run check`, and `npm run check:dom`. The checks cover source identities, local assets, knowledge edges, trail stops, 69 map controls, all eight UI languages, gallery and map interactions, and 2,688 itinerary scenarios. They do not constitute a visual browser or physical device test. Mobile gallery gestures, real rendering, network behaviour and screen reader experience still require supported browser/device QA.
