#!/usr/bin/env python3
"""Generate all four static language editions with Python's standard library."""
import argparse
import html
import json
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
LANGUAGES = {"fr": "Français", "en": "English", "nl": "Nederlands", "de": "Deutsch"}
LOCALES = {"fr": "fr_BE", "en": "en_GB", "nl": "nl_BE", "de": "de_DE"}
ICONS = {
    "compass": '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6Z"/>',
    "layers": '<path d="m12 3 10 5-10 5L2 8Z M2 12l10 5 10-5 M2 16l10 5 10-5"/>',
    "spark": '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
    "chart": '<path d="M4 3v17h17 M8 15l4-5 4 2 4-7"/>',
    "check": '<path d="m5 12 4 4 10-10"/>',
    "calendar": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4 M8 3v4 M3 11h18 M8 15h3 M14 15h2"/>'
}
MAPS = {
    "fr": [["Données", "Simulation", "Décision"], ["Processus", "Application", "Suivi"], ["Données", "Analyse", "Exploration"], ["Question", "Contexte", "Réponse"]],
    "en": [["Data", "Simulation", "Decision"], ["Workflows", "Application", "Tracking"], ["Data", "Analysis", "Exploration"], ["Question", "Context", "Response"]],
    "nl": [["Data", "Simulatie", "Beslissing"], ["Processen", "Applicatie", "Opvolging"], ["Data", "Analyse", "Verkenning"], ["Vraag", "Context", "Antwoord"]],
    "de": [["Daten", "Simulation", "Entscheidung"], ["Abläufe", "Anwendung", "Übersicht"], ["Daten", "Analyse", "Erkundung"], ["Frage", "Kontext", "Antwort"]]
}


def esc(value):
    return html.escape(str(value), quote=True)


def lines(value):
    return esc(value).replace("\n", "<br>")


def icon(name):
    return f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[name]}</svg>'


def tags(values):
    return '<ul class="service-tags">' + ''.join(f'<li>{esc(v)}</li>' for v in values) + '</ul>'


def render(content, lang, site_url, root_page=False):
    c = content[lang]
    asset_path = "assets/" if root_page else "../assets/"
    prefix = "" if root_page else "../"
    canonical = f"{site_url}/{lang}/"
    out = {k: esc(v) for k, v in c.items() if isinstance(v, str)}
    for key in ["services_title", "method_title", "work_title", "team_title", "contact_title", "footer_line"]:
        out[key] = lines(c[key])
    out.update({"lang": lang, "locale": LOCALES[lang], "asset_path": asset_path,
                "site_url": esc(site_url), "canonical": esc(canonical),
                "home_path": "./" if root_page else "../"})
    for i, value in enumerate(c["nav"]):
        out[f"nav_{i}"] = esc(value)
    for i, value in enumerate(c["hero_title"]):
        out[f"hero_title_{i}"] = esc(value)
    for i, value in enumerate(c["team_links"]):
        out[f"team_link_{i}"] = esc(value)
    out["strip"] = ''.join(f'<span>{icon("check")}{esc(v)}</span>' for v in c["strip"])
    out["alternates"] = '\n  '.join(f'<link rel="alternate" hreflang="{l}" href="{site_url}/{l}/">' for l in LANGUAGES)
    out["alternates"] += f'\n  <link rel="alternate" hreflang="x-default" href="{site_url}/fr/">'
    out["language_options"] = ''.join(f'<option value="{l}" data-url="{prefix}{l}/" {"selected" if l == lang else ""}>{l.upper()} · {label}</option>' for l, label in LANGUAGES.items())
    out["language_links"] = ''.join(f'<a href="{prefix}{l}/" lang="{l}" hreflang="{l}" aria-label="{label}" {"aria-current=\"page\"" if l == lang else ""}>{l.upper()}</a>' for l, label in LANGUAGES.items())
    out["services"] = ''.join(
        f'<article class="service-card reveal"><div class="service-icon">{icon(s["icon"])}</div><h3>{esc(s["title"])}</h3><p>{esc(s["copy"])}</p>{tags(s["tags"])}</article>' for s in c["services"])
    out["use_tabs"] = ''.join(f'<button type="button" role="tab" id="tab-{i}" aria-controls="use-panel-{i}" aria-selected="{str(i == 0).lower()}" tabindex="{0 if i == 0 else -1}">{esc(t)}</button>' for i, t in enumerate(c["use_tabs"]))
    out["uses"] = ''.join(
        f'<div class="use-panel" id="use-panel-{i}" role="tabpanel" aria-labelledby="tab-{i}" tabindex="0"><div class="use-before"><p>{esc(c["before"])}</p><h4>{esc(s["before"])}</h4></div><div class="use-after"><p>{esc(c["after"])}</p><h4>{esc(s["after"])}</h4><p class="use-copy">{esc(s["copy"])}</p><p class="use-scope">{esc(s["scope"])}</p></div></div>' for i, s in enumerate(c["uses"]))
    out["steps"] = ''.join(
        f'<article class="step reveal"><span class="step-number">0{i+1}</span><h3>{esc(s["title"])}</h3><p>{esc(s["copy"])}</p><div class="step-deliverable"><span>{esc(c["deliverable_label"])}</span><strong>{esc(s["deliverable"])}</strong></div></article>' for i, s in enumerate(c["steps"]))
    project_html = []
    for i, project in enumerate(c["projects"]):
        diagram = '<div class="project-map" aria-hidden="true">' + '<i></i>'.join(f'<span>{esc(v)}</span>' for v in MAPS[lang][i]) + '</div>'
        details = ''.join(f'<h4>{esc(c[label])}</h4><p>{esc(project[key])}</p>' for label, key in [("project_context", "context"), ("project_approach", "approach"), ("project_transfer", "transfer")])
        project_html.append(f'<details class="project-card reveal"><summary class="project-summary">{diagram}<p class="eyebrow">{esc(project["sector"])}</p><p class="project-type">{esc(project["type"])}</p><h3>{esc(project["title"])}</h3><p class="project-copy">{esc(project["summary"])}</p><div class="project-bottom">{tags(project["tags"])}<span class="project-open">{esc(c["project_button"])}<b aria-hidden="true">+</b></span></div></summary><div class="project-detail">{details}<a class="text-link" href="{esc(project["url"])}" target="_blank" rel="noopener noreferrer">{esc(c["project_source"])}</a></div></details>')
    out["projects"] = ''.join(project_html)
    out["team_principles"] = ''.join(f'<article class="team-principle reveal"><h3>{esc(v["title"])}</h3><p>{esc(v["copy"])}</p></article>' for v in c["team_principles"])
    out["faqs"] = ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in c["faqs"])
    out["need_options"] = ''.join(f'<option value="{esc(value)}">{esc(value)}</option>' for value in c["need_options"])
    out["calendar_icon"] = icon("calendar")
    schema = {"@context": "https://schema.org", "@type": "ProfessionalService", "name": "Novalis AI", "url": site_url,
              "logo": f"{site_url}/assets/logo.webp", "email": "achraf@novalisai.com", "identifier": "BE0878868302",
              "address": {"@type": "PostalAddress", "streetAddress": "Rue Barrière Moye 18", "postalCode": "1300", "addressLocality": "Wavre", "addressCountry": "BE"},
              "areaServed": {"@type": "Country", "name": "Belgium"}, "availableLanguage": list(LANGUAGES),
              "sameAs": ["https://www.linkedin.com/company/novalisai/"], "description": c["description"]}
    out["schema"] = json.dumps(schema, ensure_ascii=False).replace('<', '\\u003c')
    client = {k: c[k] for k in ["menu", "close", "mail_labels", "mail_subject", "mail_greeting", "copied", "copy_error"]}
    client["policies"] = {p: {"title": c[f"{p}_title"], "text": c[f"{p}_text"]} for p in ["privacy", "legal"]}
    out["client_data"] = json.dumps(client, ensure_ascii=False).replace('<', '\\u003c')
    template = (ROOT / 'template.html').read_text()
    result = re.sub(r'\{\{([a-z_0-9]+)\}\}', lambda m: out[m.group(1)], template)
    if '{{' in result:
        raise ValueError('Unresolved template token')
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--site-url', default='https://achraf-saidi.github.io/novalisai')
    args = parser.parse_args()
    site_url = args.site_url.rstrip('/')
    parsed = urlparse(site_url)
    if parsed.scheme != 'https' or not parsed.netloc or parsed.query or parsed.fragment:
        parser.error('--site-url must be a public HTTPS origin/path without query or fragment')
    content = json.loads((ROOT / 'content.json').read_text())
    required = set(content['fr'])
    for language in LANGUAGES:
        if set(content[language]) != required:
            raise ValueError(f'Translation keys do not match: {language}')
        folder = ROOT / language
        folder.mkdir(exist_ok=True)
        (folder / 'index.html').write_text(render(content, language, site_url))
    (ROOT / 'index.html').write_text(render(content, 'fr', site_url, root_page=True))
    urls = ''.join(f'<url><loc>{site_url}/{language}/</loc></url>' for language in LANGUAGES)
    (ROOT / 'sitemap.xml').write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>\n')
    print('Generated FR, EN, NL, DE and the French home page.')


if __name__ == '__main__':
    main()
