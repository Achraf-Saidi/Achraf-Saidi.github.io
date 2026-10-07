#!/usr/bin/env python3
"""Generate all four static language editions with Python's standard library."""
import argparse
import hashlib
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
    "calendar": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4 M8 3v4 M3 11h18 M8 15h3 M14 15h2"/>',
    "document": '<path d="M14 2H5v20h14V7Z M14 2v5h5 M8 11h8 M8 15h8 M8 18h5"/>',
    "apps": '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    "people": '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3 M17 4a3 3 0 0 1 0 6 M21 21v-3a6 6 0 0 0-3-5.2"/>'
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


def project_art(index):
    """Original editorial illustrations; these are not client screenshots or results."""
    opening = '<svg viewBox="0 0 600 290" fill="none" aria-hidden="true" focusable="false">'
    if index == 0:
        cells = ''.join(f'<rect x="{332 + i * 42}" y="83" width="30" height="94" rx="7" fill="#f2b86f"/><path d="M{341 + i * 42} 98h12M{341 + i * 42} 107h12" stroke="#ba7542" stroke-width="2"/>' for i in range(4))
        bars = ''.join(f'<rect x="{88 + i * 16}" y="{211 - v}" width="9" height="{v}" rx="2" fill="{("#c27246" if i > 7 else "#efbd81")}"/>' for i, v in enumerate([17, 23, 40, 61, 48, 35, 22, 18, 28, 42, 62, 74, 53, 32]))
        body = f'<rect x="55" y="63" width="292" height="183" rx="17" fill="white" stroke="#e7d2bb"/><circle cx="77" cy="82" r="3" fill="#dba774"/><rect x="89" y="79" width="76" height="6" rx="3" fill="#e7ddd2"/><path d="M79 116H322M79 146H322M79 176H322M79 212H322" stroke="#f1ece6"/>{bars}<path d="M84 168C111 164 119 176 141 161S170 117 195 135S230 159 247 128S282 101 303 110S325 119 334 101" stroke="#9a5935" stroke-width="3" stroke-linecap="round"/><rect x="318" y="65" width="194" height="130" rx="18" fill="#fffaf3" stroke="#d7af7c"/>{cells}<path d="M335 189h160" stroke="#d8bd9d" stroke-width="3" stroke-linecap="round"/><rect x="385" y="46" width="56" height="11" rx="4" fill="#d7af7c"/><path d="M445 191v30h70" stroke="#9a5935" stroke-width="2" stroke-dasharray="5 5"/><circle cx="519" cy="220" r="20" fill="#fffaf3" stroke="#c78a50"/><path d="m520 208-8 13h7l-2 10 9-14h-7l1-9Z" fill="#bd7942"/>'
    elif index == 1:
        rows = ''.join(f'<circle cx="169" cy="{117 + i * 39}" r="11" fill="#edf2ef"/><path d="m165 {117 + i * 39} 3 3 5-6" stroke="#668276" stroke-width="1.7" stroke-linecap="round"/><rect x="190" y="{112 + i * 39}" width="{97 - i * 9}" height="7" rx="3.5" fill="#d9e2dd"/><rect x="190" y="{124 + i * 39}" width="58" height="4" rx="2" fill="#edf0ed"/>' for i in range(3))
        body = f'<rect x="318" y="48" width="182" height="189" rx="14" transform="rotate(9 318 48)" fill="#e3e8e4"/><rect x="315" y="61" width="181" height="189" rx="14" transform="rotate(-6 315 61)" fill="#fbfcfa" stroke="#c8d7ce"/><rect x="74" y="64" width="345" height="189" rx="17" fill="white" stroke="#ccd8d0"/><path d="M139 65v187" stroke="#e6ebe7"/><circle cx="106" cy="90" r="11" fill="#e2b680"/><path d="M96 132h20M96 150h16M96 168h20" stroke="#adbfb1" stroke-width="4" stroke-linecap="round"/><rect x="160" y="83" width="130" height="8" rx="4" fill="#677b70"/>{rows}<rect x="322" y="121" width="111" height="111" rx="13" fill="#fff5e5" stroke="#e1c5a0"/><circle cx="378" cy="161" r="19" fill="#f5dab7"/><path d="m369 161 6 6 12-13" stroke="#af743e" stroke-width="2.5" stroke-linecap="round"/><rect x="344" y="192" width="68" height="5" rx="2.5" fill="#c5a981"/><rect x="354" y="205" width="48" height="4" rx="2" fill="#e1ceb4"/>'
    elif index == 2:
        points = ''.join(f'<circle cx="{85 + (i * 37) % 150}" cy="{104 + (i * 23) % 108}" r="{3 + i % 3}" fill="{["#bba0b9", "#daa889", "#a87c9c"][i % 3]}" opacity=".85"/>' for i in range(28))
        tiles = ''.join(f'<rect x="{326 + (i % 7) * 18}" y="{151 + (i // 7) * 16}" width="13" height="11" rx="2" fill="{["#e8d6dc", "#b388a3", "#d8a488", "#f0e4e7"][i % 4]}"/>' for i in range(28))
        body = f'<rect x="55" y="63" width="242" height="186" rx="16" fill="white" stroke="#ded0db"/><rect x="80" y="83" width="98" height="7" rx="3.5" fill="#b79bad"/><path d="M80 115h185M80 149h185M80 183h185M80 218h185M95 108v121M143 108v121M191 108v121M239 108v121" stroke="#f2ebf0"/>{points}<rect x="309" y="65" width="194" height="178" rx="16" fill="#fffafb" stroke="#ddcdd6"/><rect x="329" y="86" width="93" height="6" rx="3" fill="#b396aa"/><path d="M327 121h155" stroke="#eadce2"/><path d="M330 119c15-1 16-30 33-24s17 36 34 16 23-14 36-8 27 16 46-4" stroke="#a97594" stroke-width="3" stroke-linecap="round"/>{tiles}<circle cx="494" cy="226" r="27" fill="#f4e2ce" stroke="#d8b598"/><circle cx="494" cy="226" r="15" stroke="#b78864" stroke-width="5" stroke-dasharray="64 32" transform="rotate(-90 494 226)"/>'
    else:
        body = '<rect x="100" y="63" width="365" height="182" rx="18" fill="white" stroke="#e2c9bc"/><path d="M100 99h365" stroke="#eee2da"/><circle cx="123" cy="82" r="3" fill="#d39a7b"/><circle cx="135" cy="82" r="3" fill="#e9c5a7"/><circle cx="147" cy="82" r="3" fill="#eee1d4"/><rect x="135" y="117" width="212" height="38" rx="13" fill="#f7eee5"/><rect x="150" y="132" width="155" height="5" rx="2.5" fill="#caa386"/><rect x="203" y="167" width="226" height="48" rx="13" fill="#f3d6bc"/><path d="M219 185h165M219 197h116" stroke="#b57b51" stroke-width="4" stroke-linecap="round"/><rect x="61" y="143" width="97" height="81" rx="13" fill="#fffaf4" stroke="#e1c6ae"/><path d="m102 157 4 11 11 4-11 4-4 11-4-11-11-4 11-4Z" fill="#d99d60"/><path d="M80 204h58" stroke="#e8d3bc" stroke-width="4" stroke-linecap="round"/><circle cx="471" cy="88" r="24" fill="#f1d9bc" stroke="#d4af80"/><path d="m462 88 6 6 12-13" stroke="#a77346" stroke-width="2.5" stroke-linecap="round"/>'
    return opening + body + '</svg>'


def render(content, lang, site_url, root_page=False):
    c = content[lang]
    asset_path = "assets/" if root_page else "../assets/"
    prefix = "" if root_page else "../"
    canonical = f"{site_url}/{lang}/"
    out = {k: esc(v) for k, v in c.items() if isinstance(v, str)}
    for key in ["services_title", "method_title", "work_title", "team_title", "contact_title", "footer_line", "saas_title"]:
        out[key] = lines(c[key])
    out.update({"lang": lang, "locale": LOCALES[lang], "asset_path": asset_path,
                "site_url": esc(site_url), "canonical": esc(canonical),
                "home_path": "./" if root_page else "../",
                "style_version": hashlib.sha256((ROOT / 'assets/styles.css').read_bytes()).hexdigest()[:10],
                "script_version": hashlib.sha256((ROOT / 'assets/app.js').read_bytes()).hexdigest()[:10]})
    for i, value in enumerate(c["nav"]):
        out[f"nav_{i}"] = esc(value)
    for i, value in enumerate(c["hero_title"]):
        out[f"hero_title_{i}"] = esc(value)
    for i, value in enumerate(c["team_links"]):
        out[f"team_link_{i}"] = esc(value)
    out["strip"] = ''.join(f'<span>{icon("check")}{esc(v)}</span>' for v in c["strip"])
    out["flow_sources"] = ''.join(f'<div class="source-card">{icon(name)}<span>{esc(label)}</span></div>' for name, label in zip(["document", "apps", "people"], c["diagram_sources"]))
    out["flow_steps"] = ''.join(f'<li><span class="engine-step-number">0{i+1}</span><span data-flow-step="{i}">{esc(label)}</span>{icon("check")}</li>' for i, label in enumerate(c["diagram_states"]["after"]["steps"]))
    out["check_icon"] = icon("check")
    out.update({f"flow_{key}":esc(c["diagram_states"]["after"][key]) for key in ["title", "human", "result"]})
    out["alternates"] = '\n  '.join(f'<link rel="alternate" hreflang="{l}" href="{site_url}/{l}/">' for l in LANGUAGES)
    out["alternates"] += f'\n  <link rel="alternate" hreflang="x-default" href="{site_url}/fr/">'
    out["language_options"] = ''.join(f'<option value="{l}" data-url="{prefix}{l}/" {"selected" if l == lang else ""}>{l.upper()}</option>' for l, label in LANGUAGES.items())
    out["language_links"] = ''.join(f'<a href="{prefix}{l}/" lang="{l}" hreflang="{l}" aria-label="{label}" {"aria-current=\"page\"" if l == lang else ""}>{l.upper()}</a>' for l, label in LANGUAGES.items())
    out["services"] = ''.join(
        f'<article class="service-card reveal"><div class="service-card-top"><span class="service-number">0{i+1}</span><div class="service-icon">{icon(s["icon"])}</div></div><h3>{esc(s["title"])}</h3><p>{esc(s["copy"])}</p>{tags(s["tags"])}</article>' for i, s in enumerate(c["services"]))
    out["use_tabs"] = ''.join(f'<button type="button" role="tab" id="tab-{i}" aria-controls="use-panel-{i}" aria-selected="{str(i == 0).lower()}" tabindex="{0 if i == 0 else -1}">{esc(t)}</button>' for i, t in enumerate(c["use_tabs"]))
    out["uses"] = ''.join(
        f'<div class="use-panel" id="use-panel-{i}" role="tabpanel" aria-labelledby="tab-{i}" tabindex="0"><div class="use-before"><p>{esc(c["before"])}</p><h4>{esc(s["before"])}</h4></div><div class="use-after"><p>{esc(c["after"])}</p><h4>{esc(s["after"])}</h4><p class="use-copy">{esc(s["copy"])}</p><p class="use-scope">{esc(s["scope"])}</p></div></div>' for i, s in enumerate(c["uses"]))
    out["steps"] = ''.join(
        f'<article class="step reveal"><span class="step-number">0{i+1}</span><div class="step-body"><h3>{esc(s["title"])}</h3><p>{esc(s["copy"])}</p><div class="step-deliverable"><span>{esc(c["deliverable_label"])}</span><strong>{esc(s["deliverable"])}</strong></div></div></article>' for i, s in enumerate(c["steps"]))
    project_html = []
    for i, project in enumerate(c["projects"]):
        diagram = '<div class="project-map" aria-hidden="true">' + '<i></i>'.join(f'<span>{esc(v)}</span>' for v in MAPS[lang][i]) + '</div>'
        details = ''.join(f'<h4>{esc(c[label])}</h4><p>{esc(project[key])}</p>' for label, key in [("project_context", "context"), ("project_approach", "approach"), ("project_transfer", "transfer")])
        visual = f'<div class="project-visual project-visual-{i}"><span class="project-index" aria-hidden="true">N / 0{i+1}</span>{project_art(i)}{diagram}<span class="project-illustration">{esc(c["project_illustration"])}</span></div>'
        project_html.append(f'<details class="project-card reveal"><summary class="project-summary">{visual}<div class="project-content"><p class="eyebrow">{esc(project["sector"])}</p><h3>{esc(project["title"])}</h3><p class="project-copy">{esc(project["summary"])}</p><p class="project-type">{esc(project["type"])}</p><div class="project-bottom">{tags(project["tags"])}<span class="project-open">{esc(c["project_button"])}<b aria-hidden="true">↗</b></span></div></div></summary><div class="project-detail">{details}<a class="text-link" href="{esc(project["url"])}" target="_blank" rel="noopener noreferrer">{esc(c["project_source"])}</a></div></details>')
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
    client["diagram_states"] = c["diagram_states"]
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
    review = ROOT / 'qa/responsive.html'
    if review.is_file():
        revision = hashlib.sha256((ROOT / 'assets/styles.css').read_bytes() + (ROOT / 'assets/app.js').read_bytes()).hexdigest()[:10]
        review.write_text(re.sub(r'data-review-version="[^"]*"', f'data-review-version="{revision}"', review.read_text()))
    print('Generated FR, EN, NL, DE and the French home page.')


if __name__ == '__main__':
    main()
