# BILADI — El Djazaïr

A photographic, multilingual atlas and travel planner for Algeria. The application is hosted at https://achraf-saidi.github.io/biladi/ with GitHub Pages. All assets and code live in this folder.

The interface and curated editorial content cover French, English, Arabic (RTL), German, Italian, Spanish, Portuguese and Chinese. The atlas covers the 69 wilayas in the 2026 administrative division. Original place and source titles in the open-data inventory keep their original spellings.

## Application

- `app.js`: hash routing, atlas, search, directory, notebook, forms and calendar export.
- `content.js`: curated destinations, dishes, restaurant references and travel information.
- `i18n.js`: eight-language interface.
- `journey.js`: deterministic, season-aware itinerary and editable cost model.
- `data/`: editorial sources, photo attribution, open geographic and tourism records.
- `assets/`: licensed photographs, local fonts and vector branding.

The planner reserves a night in Algiers when a domestic connection would otherwise require an unverified same-day transfer. It excludes deep Sahara routes from June through September and ends with a night in Algiers. Duration and travel times are estimates, not confirmed transport schedules. Flights open dated provider searches; there is no live fare, booking, availability or visa-eligibility API. Price presets are editorial assumptions and can be edited. The 278 DZD/EUR setting is a user-requested, unverified personal scenario. The separate official EUR reference is dated 6 October 2026 and must be refreshed from the Bank of Algeria before financial use.

Notebook content is stored in the visitor's browser. Shared itinerary URLs contain the form choices, so users should avoid entering private information in the departure field. There are no accounts, payments or analytics.

## Verification

Run `npm run check` for syntax, translation completeness, source and asset integrity, all 69 map codes, 2,688 season/duration/preference itinerary combinations, budgets and RFC 5545 export. After `npm install`, run `npm run check:dom` for JSDOM integration checks of routes, language switching, atlas keyboard controls, forms, search, directory, local saves and trip links without a browser. A preinstalled JSDOM can be selected with `BILADI_JSDOM_PATH`.

The managed build session did not provide a supported browser-control capability; device layout and browser visuals were not verified. Responsive CSS is implemented for desktop, tablet and phone; release notes must preserve this verification limit.

Sources and licenses appear in the site's Sources & credits view. The maps and OSM-derived data retain their attribution and ODbL terms. Photos retain their individual Wikimedia licenses. DM Sans and Fraunces use the SIL Open Font License, reproduced in `data/font-licenses.txt`.
