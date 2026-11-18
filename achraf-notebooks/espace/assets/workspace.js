import "./preview-adapter.js";
const $ = (s) => document.querySelector(s);
const S = {
  config: null,
  catalog: null,
  me: null,
  lessons: [],
  trainings: [],
  offers: [],
  admin: null,
  view: "home",
  param: "",
  filter: "",
  school: "all",
  onboardStep: 0,
  dirty: false,
  editing: null,
  chat: [],
  authMode: "register",
};
const labels = {
  home: "Vue d’ensemble",
  roadmap: "Mon parcours",
  catalog: "Explorer les modules",
  progress: "Mes résultats",
  notes: "Mon carnet",
  review: "Mes révisions",
  tutor: "Assistant Notebook",
  plans: "Mon abonnement",
  settings: "Mon profil",
  onboarding: "Créer mon parcours",
  join: "Mon compte",
  study: "Espace de travail",
  admin: "Studio administrateur",
};
const paths = {
  home: "M3 9l9-6 9 6v11H3z M9 20v-7h6v7",
  roadmap: "M5 4h5v5H5z M14 15h5v5h-5z M10 6h7v9 M5 9v8h9",
  catalog: "M4 4h7v16H4z M14 4h6v16h-6z",
  progress: "M4 20V4 M4 20h17 M8 16v-5 M13 16V8 M18 16V5",
  notes: "M5 3h14v18H5z M8 7h8 M8 11h8 M8 15h5",
  review: "M4 8a8 8 0 1 1-1 6 M4 3v5h5 M12 7v5l3 2",
  tutor: "M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z",
  plans: "M3 6h18v13H3z M3 10h18 M6 15h3",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
  admin: "M4 20h16 M7 20V9l5-6 5 6v11 M10 20v-6h4v6",
  arrow: "M5 12h14 M14 7l5 5-5 5",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6",
  check: "M5 12l4 4L19 6",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l4 2",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  close: "M6 6l12 12 M18 6L6 18",
  sun: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1",
  download: "M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4",
  file: "M5 3h9l5 5v13H5z M14 3v6h5 M8 13h8 M8 17h5",
  plus: "M12 4v16 M4 12h16",
  lock: "M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3",
};
function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (k === "value") n.value = v;
    else if (k === "checked") n.checked = Boolean(v);
    else if (k === "disabled") n.disabled = Boolean(v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat(Infinity))
    if (c !== null && c !== undefined && c !== false)
      n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return n;
}
function svg(tag, attrs = {}, ...children) {
  const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  children
    .flat()
    .forEach((c) =>
      n.append(c instanceof Node ? c : document.createTextNode(String(c))),
    );
  return n;
}
function icon(name) {
  return svg(
    "svg",
    { viewBox: "0 0 24 24", class: "icon", "aria-hidden": "true" },
    svg("path", { d: paths[name] || paths.file }),
  );
}
const btn = (text, fn, kind = "") =>
  el("button", { type: "button", class: "btn " + kind, onclick: fn }, text);
const link = (text, href, kind = "") =>
  el("a", { class: "btn " + kind, href }, text);
const pill = (text, kind = "") => el("span", { class: "pill " + kind }, text);
const card = (...c) => el("section", { class: "card" }, ...c);
const field = (label, node, help) =>
  el(
    "label",
    { class: "field" },
    label,
    node,
    help ? el("small", {}, help) : null,
  );
const input = (type, value, attrs = {}) =>
  el("input", { type, value, ...attrs });
function select(value, options, attrs = {}) {
  const n = el(
    "select",
    attrs,
    options.map(([v, t]) => el("option", { value: v }, t)),
  );
  n.value = value;
  return n;
}
const opts = (o) => Object.entries(o).map(([v, t]) => [v, t]);
const fmt = (n) =>
  new Intl.NumberFormat("fr-BE", { maximumFractionDigits: 1 }).format(n);
const euro = (n) =>
  new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
const date = (v) =>
  new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "short" }).format(
    new Date(v),
  );
const title = (id) => S.catalog.modules.find((m) => m.id === id)?.title || id;
const courseUrl = (id) =>
  "https://achraf-saidi.github.io/achraf-notebooks/academy/fr/?id=" +
  encodeURIComponent(id);
const outside = (text, url) =>
  el(
    "a",
    {
      href: url,
      target: "_blank",
      rel: "noopener noreferrer",
      class: "btn small",
    },
    text,
    " ↗",
  );
let toastTimer;
function notify(t) {
  $("#toast").textContent = t;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 6000);
}
const errors = {
  authentication_required: "Connectez-vous pour retrouver votre espace.",
  admin_required: "Cet espace est réservé à l’administrateur.",
  revision_conflict:
    "Une version plus récente existe. Copiez vos modifications avant de recharger cette page.",
  workspace_unavailable:
    "Service indisponible. Vos modifications restent dans le formulaire ; réessayez.",
  file_too_large: "Le fichier dépasse la limite de 8 Mo.",
  invalid_asset_type: "Choisissez un fichier PDF, PNG ou JPEG valide.",
  invalid_question:
    "Vérifiez les deux langues, les explications (40 caractères minimum) et la réponse correcte.",
  invalid_profile:
    "Vérifiez votre objectif, votre rythme et vos jours disponibles.",
};
async function api(path, data, method) {
  const r = await fetch(path, {
    method: method || (data === undefined ? "GET" : "POST"),
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(data === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const value = await r
    .json()
    .catch(() => ({ error: "workspace_unavailable" }));
  if (!r.ok) {
    const error = Error(
      errors[value.error] ||
        value.message ||
        value.error ||
        "Service indisponible",
    );
    error.status = r.status;
    throw error;
  }
  return value;
}
async function action(fn, b) {
  if (b) b.disabled = true;
  try {
    await fn();
  } catch (e) {
    notify(e.message);
  } finally {
    if (b?.isConnected) b.disabled = false;
  }
}
async function refresh() {
  S.me = await api("/api/workspace/me");
}
function dirty() {
  S.dirty = true;
}
function leave() {
  if (!S.dirty) return true;
  if (
    !confirm("Des modifications ne sont pas enregistrées. Quitter cette page ?")
  )
    return false;
  S.dirty = false;
  return true;
}
function go(view, param = "") {
  if (!leave()) return;
  location.hash = view + (param ? "/" + encodeURIComponent(param) : "");
}
window.addEventListener("beforeunload", (e) => {
  if (S.dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
document.addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (a && S.dirty && a.getAttribute("href")?.startsWith("#") && !leave())
    e.preventDefault();
});
function head(titleText, subtitle, actionNode) {
  return el(
    "header",
    { class: "page-head" },
    el(
      "div",
      {},
      el(
        "p",
        { class: "eyebrow" },
        S.view === "admin"
          ? "ÉDITION & PILOTAGE"
          : "VOTRE ESPACE D’APPRENTISSAGE",
      ),
      el("h1", {}, titleText),
      el("p", {}, subtitle),
    ),
    actionNode,
  );
}
function sectionHead(t, a) {
  return el("div", { class: "card-head" }, el("h2", {}, t), a);
}
function empty(t, p, a) {
  return el("div", { class: "empty" }, el("h3", {}, t), el("p", {}, p), a);
}
function progress(n, total) {
  return el("progress", {
    value: n,
    max: Math.max(1, total),
    "aria-label": `${n} sur ${total}`,
  });
}
function stat(label, value, detail, ico) {
  return el(
    "div",
    { class: "stat" },
    el("div", { class: "label" }, label, icon(ico)),
    el("strong", {}, value),
    el("small", {}, detail),
  );
}
function modal(titleText, body) {
  const d = $("#modal");
  d.replaceChildren(
    el(
      "div",
      { class: "card-head" },
      el("h2", { id: "modal-title" }, titleText),
      btn("Fermer", () => d.close(), "small"),
    ),
    body,
  );
  d.showModal();
}
function searchModal() {
  const box = input("search", "", {
      placeholder: "Ex. Python, Bayes, optimisation…",
      "aria-label": "Rechercher un module",
    }),
    out = el("div", { class: "modal-results" });
  const update = () => {
    const q = box.value.toLocaleLowerCase("fr");
    out.replaceChildren(
      ...S.catalog.modules
        .filter((m) =>
          (m.id + " " + m.title).toLocaleLowerCase("fr").includes(q),
        )
        .slice(0, 15)
        .map((m) =>
          el(
            "a",
            { href: "#study/" + m.id, onclick: () => $("#modal").close() },
            m.id + " · " + m.title,
          ),
        ),
    );
  };
  box.addEventListener("input", update);
  modal(
    "Retrouver une notion",
    el("div", { class: "form-stack" }, field("Cours et modules", box), out),
  );
  update();
  box.focus();
}
function shell(main) {
  const isAdmin = S.me?.isAdmin,
    name = S.me?.user.name || "Invité",
    initials = name
      .split(" ")
      .slice(0, 2)
      .map((x) => x[0])
      .join("");
  const due = (S.me?.reviews || []).filter(
    (r) => new Date(r.due_at) <= new Date(),
  ).length;
  const nav = (id, label, count) =>
    el(
      "a",
      {
        href: "#" + id,
        class: "nav" + (S.view === id ? " active" : ""),
        "aria-current": S.view === id ? "page" : null,
        onclick: () => document.body.classList.remove("menu-open"),
      },
      icon(id),
      label,
      count ? el("span", { class: "count" }, count) : null,
    );
  const side = el(
    "aside",
    { class: "sidebar", "aria-label": "Navigation principale" },
    el(
      "a",
      { class: "brand", href: "#home" },
      el("span", { class: "brand-mark" }, "a"),
      el("span", {}, "achraf’s", el("small", {}, "NOTEBOOK")),
    ),
    el(
      "nav",
      {},
      nav("home", "Vue d’ensemble"),
      nav("roadmap", "Mon parcours"),
      nav("catalog", "Explorer"),
      el(
        "div",
        { class: "navgroup" },
        el("p", { class: "eyebrow" }, "MON APPRENTISSAGE"),
        nav("progress", "Mes résultats"),
        nav("notes", "Mon carnet"),
        nav("review", "Mes révisions", due),
        nav("tutor", "Assistant Notebook"),
      ),
      isAdmin
        ? el(
            "div",
            { class: "navgroup" },
            el("p", { class: "eyebrow" }, "CRÉATION"),
            nav("admin", "Studio administrateur"),
          )
        : null,
    ),
    el(
      "div",
      { class: "sidebar-bottom" },
      el(
        "div",
        { class: "sidebar-promo" },
        el("p", {}, el("strong", {}, "Un parcours qui vous ressemble.")),
        el(
          "p",
          { class: "muted" },
          "Votre objectif, votre rythme. Ajustez-les à tout moment.",
        ),
        link("Ajuster mon parcours →", "#onboarding", "quiet small"),
      ),
      nav("settings", "Mon profil"),
      el(
        "div",
        { class: "person" },
        el("div", { class: "avatar" }, initials),
        el(
          "div",
          {},
          name,
          el(
            "small",
            {},
            S.config.mode === "demo"
              ? "Profil de démonstration"
              : "Espace personnel",
          ),
        ),
      ),
    ),
  );
  const top = el(
    "header",
    { class: "topbar" },
    el(
      "div",
      { class: "row" },
      el(
        "button",
        {
          class: "icon-btn mobile-toggle",
          "aria-label": "Ouvrir le menu",
          "aria-expanded": document.body.classList.contains("menu-open"),
          onclick: (e) => {
            const open = document.body.classList.toggle("menu-open");
            e.currentTarget.setAttribute("aria-expanded", open);
          },
        },
        icon("menu"),
      ),
      el(
        "div",
        { class: "breadcrumb" },
        "Mon espace",
        el("span", {}, "/"),
        el("b", {}, labels[S.view] || "Notebook"),
      ),
    ),
    el(
      "div",
      { class: "top-actions" },
      el(
        "button",
        { class: "search-trigger", onclick: searchModal },
        icon("search"),
        "Rechercher une notion",
        el("kbd", {}, "Ctrl K"),
      ),
      el(
        "button",
        {
          class: "icon-btn",
          "aria-label": "Changer le thème",
          onclick: () => {
            document.documentElement.classList.toggle("dark");
            try {
              localStorage.setItem(
                "notebook-workspace-theme",
                document.documentElement.classList.contains("dark")
                  ? "dark"
                  : "light",
              );
            } catch {}
          },
        },
        icon("sun"),
      ),
      el(
        "a",
        { class: "avatar", href: "#settings", "aria-label": "Mon profil" },
        initials,
      ),
    ),
  );
  $("#app").replaceChildren(
    el(
      "div",
      { class: "layout" },
      side,
      el(
        "div",
        { class: "shell" },
        top,
        S.config.mode === "demo"
          ? el(
              "div",
              { class: "demo-bar" },
              el(
                "span",
                {},
                "APERÇU EN CONSULTATION · Profil fictif · Modifications non enregistrées",
              ),
              btn("Découvrir l’inscription", () => go("join"), "quiet small"),
            )
          : null,
        el(
          "main",
          { id: "main", tabindex: "-1" },
          main,
          el(
            "footer",
            { class: "footer-note" },
            el(
              "span",
              {},
              "Achraf’s Notebook · Comprendre. Pratiquer. Maîtriser.",
            ),
            el("span", {}, "Votre progression vous appartient."),
          ),
        ),
      ),
    ),
  );
}
function art() {
  return el(
    "div",
    { class: "hero-art", "aria-hidden": "true" },
    svg(
      "svg",
      { viewBox: "0 0 220 210" },
      svg("path", {
        d: "M25 35L160 15l34 151-135 27z",
        fill: "#294f40",
        stroke: "#8da87d",
        "stroke-width": 1,
      }),
      svg("path", {
        d: "M39 29L172 20l15 159-132 10z",
        fill: "#cbdcaa",
        stroke: "#dce8ca",
        "stroke-width": 1,
      }),
      svg("path", {
        d: "M58 47h100 M61 65h100 M62 83h100 M65 101h100 M66 119h100 M67 137h100 M69 155h100",
        stroke: "#adbd94",
        "stroke-width": 0.6,
      }),
      svg("path", { d: "M75 36l10 141", stroke: "#a1b58a", "stroke-width": 1 }),
      svg("path", {
        d: "M80 143C94 142 105 135 113 119s12-46 20-46 10 51 34 51",
        fill: "none",
        stroke: "#3b6447",
        "stroke-width": 2.5,
      }),
      svg(
        "text",
        {
          x: 93,
          y: 60,
          fill: "#55714d",
          "font-family": "Georgia",
          "font-style": "italic",
          "font-size": 14,
        },
        "f(x) → apprendre",
      ),
      svg("circle", { cx: 170, cy: 164, r: 23, fill: "#e7f0d6" }),
      svg("path", {
        d: "M159 164l7 7 13-16",
        stroke: "#507047",
        fill: "none",
        "stroke-width": 2,
      }),
    ),
  );
}
function upcomingWeek() {
  const today = new Date(),
    start = new Date(today);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return el(
    "div",
    { class: "week" },
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return el(
        "div",
        {
          class:
            "day" +
            (S.me.profile.days.includes(d.getDay()) ? " planned" : "") +
            (d.toDateString() === today.toDateString() ? " today" : ""),
        },
        ["L", "M", "M", "J", "V", "S", "D"][i],
        el("b", {}, d.getDate()),
        el("span", {}),
      );
    }),
  );
}
function home() {
  if (!S.me) return welcome();
  const r = S.me.roadmap,
    next = r.modules.find((m) => m.id === r.next),
    due = S.me.reviews.filter((x) => new Date(x.due_at) <= new Date()).length;
  const recent = S.me.sessions.filter(
    (x) => new Date(x.studied_at) > new Date(Date.now() - 7 * 86400000),
  );
  const mins = recent.reduce((n, s) => n + s.minutes, 0),
    scores = S.me.attempts.filter((a) => typeof a.score === "number");
  return [
    head(
      `Bonjour ${S.me.user.name.split(" ")[0]}.`,
      "Chaque notion comprise est une nouvelle possibilité.",
      el(
        "span",
        { class: "date-label" },
        new Intl.DateTimeFormat("fr-BE", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(new Date()),
      ),
    ),
    !S.me.profile.onboarded
      ? el(
          "div",
          { class: "info-line" },
          icon("roadmap"),
          el(
            "span",
            { class: "grow" },
            "Construisons votre parcours en trois étapes : objectif, niveau et rythme.",
          ),
          link("Personnaliser", "#onboarding", "small"),
        )
      : null,
    el(
      "div",
      { class: "grid cols-2" },
      el(
        "section",
        { class: "hero" },
        el(
          "div",
          { class: "hero-copy" },
          el("p", { class: "eyebrow" }, "VOTRE PROCHAINE ÉTAPE"),
          el("h2", {}, next ? next.title : "Prêt pour une nouvelle étape ?"),
          el(
            "p",
            {},
            next
              ? "Reprenez le fil, explorez les idées et prenez le temps de les comprendre."
              : "Revenez sur vos notions ou découvrez une nouvelle spécialisation.",
          ),
          el(
            "div",
            { class: "hero-meta" },
            el("span", {}, next?.id || "PARCOURS"),
            el(
              "span",
              {},
              S.me.profile.sessionMinutes + " min pour votre prochaine session",
            ),
            el("span", {}, "À votre rythme"),
          ),
          link(
            "Continuer à apprendre  →",
            next ? "#study/" + next.id : "#catalog",
            "light",
          ),
        ),
        art(),
      ),
      el(
        "section",
        { class: "card goal-card" },
        el(
          "div",
          {},
          sectionHead(
            "Votre cap",
            link("Modifier", "#onboarding", "quiet small"),
          ),
          pill("PARCOURS PERSONNALISÉ"),
          el("h3", { class: "goal-title section-title" }, r.title),
          el("p", { class: "muted" }, r.why),
        ),
        el(
          "div",
          {},
          el(
            "div",
            { class: "row between" },
            el("small", {}, "Modules étudiés"),
            el("small", {}, r.studied + " / " + r.modules.length),
          ),
          progress(r.studied, r.modules.length),
          el(
            "p",
            { class: "muted" },
            el(
              "small",
              {},
              "Les validations d’examen sont comptées séparément.",
            ),
          ),
          link("Voir ma roadmap →", "#roadmap", "quiet small"),
        ),
      ),
    ),
    el(
      "div",
      { class: "stats" },
      stat(
        "Modules étudiés",
        r.studied,
        "sur " + r.modules.length + " dans votre parcours",
        "catalog",
      ),
      stat(
        "Moyenne des tentatives",
        scores.length
          ? fmt(scores.reduce((n, a) => n + a.score, 0) / scores.length) + " %"
          : "—",
        scores.length
          ? scores.length + " tentatives corrigées"
          : "Après votre première évaluation",
        "progress",
      ),
      stat(
        "Temps cette semaine",
        fmt(mins / 60) + " h",
        "déclaré · objectif " + S.me.profile.weeklyHours + " h",
        "clock",
      ),
      stat(
        "Notions à revoir",
        due,
        due
          ? "Une petite session pour consolider"
          : "Aucune révision en retard",
        "review",
      ),
    ),
    el(
      "div",
      { class: "grid cols-2" },
      card(
        sectionHead(
          "La suite de votre parcours",
          link("Tout voir", "#roadmap", "quiet small"),
        ),
        r.modules
          .filter((m) => m.status === "ready" || m.status === "prerequisites")
          .slice(0, 3)
          .map((m, i) =>
            el(
              "div",
              { class: "mini-step" },
              el(
                "div",
                { class: "step-dot" + (i === 0 ? " current" : "") },
                String(i + 1).padStart(2, "0"),
              ),
              el(
                "div",
                { class: "grow" },
                el("strong", {}, m.title),
                el(
                  "small",
                  {},
                  m.id +
                    " · " +
                    (m.role === "foundation" ? "Fondation" : "Objectif") +
                    " · " +
                    m.estimatedHours +
                    " h indicatives",
                ),
              ),
              link(
                i === 0 ? "Reprendre →" : "Explorer",
                "#study/" + m.id,
                "quiet small",
              ),
            ),
          ),
      ),
      card(
        sectionHead(
          "Votre semaine",
          link("Ajuster", "#onboarding", "quiet small"),
        ),
        el(
          "p",
          { class: "muted" },
          "Un rythme régulier, sans course aux séries.",
        ),
        upcomingWeek(),
        el(
          "div",
          { class: "row between" },
          el("small", {}, S.me.profile.days.length + " jours choisis"),
          pill(S.me.profile.weeklyHours + " h / semaine"),
        ),
      ),
    ),
    el(
      "div",
      { class: "grid cols-2 section-gap" },
      card(
        sectionHead(
          "Votre carnet de bord",
          link("Ouvrir le carnet", "#notes", "quiet small"),
        ),
        S.me.notes.length
          ? S.me.notes
              .slice(0, 2)
              .map((n) =>
                el(
                  "div",
                  { class: "mini-step" },
                  icon("notes"),
                  el(
                    "div",
                    { class: "grow" },
                    el("strong", {}, title(n.module_id)),
                    el("small", {}, n.body.slice(0, 95) || "Note vide"),
                  ),
                  link("Ouvrir", "#notes/" + n.module_id, "quiet small"),
                ),
              )
          : empty(
              "Les idées qui restent.",
              "Notez une intuition, un exemple ou une question en travaillant un module.",
              link("Écrire ma première note", "#notes", "small"),
            ),
      ),
      el(
        "section",
        { class: "card tutor-card" },
        el(
          "div",
          { class: "row" },
          el("div", { class: "tutor-orb" }, icon("tutor")),
          el("h3", {}, "Un coup de pouce, au bon endroit."),
        ),
        el(
          "p",
          { class: "muted" },
          "Retrouvez les ressources de votre module. Le futur tuteur pourra guider votre raisonnement à partir de ces sources.",
        ),
        pill("TUTEUR IA · EN PRÉPARATION", "neutral"),
        el(
          "div",
          { class: "section-gap" },
          link("Explorer les ressources →", "#tutor", "quiet small"),
        ),
      ),
    ),
  ];
}
function welcome() {
  return [
    head(
      "Un espace pour aller plus loin.",
      "Votre parcours, vos notes et vos résultats au même endroit.",
    ),
    card(
      el("h2", {}, "Commencez avec un compte gratuit"),
      el(
        "p",
        { class: "muted" },
        "Choisissez votre objectif, puis avancez à votre rythme. Votre travail sera enregistré dans votre espace.",
      ),
      link("Créer mon compte", "#join", "primary"),
      link("Explorer le catalogue", "#catalog", "quiet"),
    ),
  ];
}
function roadmap() {
  if (!S.me) return welcome();
  const r = S.me.roadmap;
  return [
    head(
      "Le chemin devient clair.",
      r.title,
      link("Adapter mon parcours", "#onboarding", "small"),
    ),
    el(
      "div",
      { class: "grid cols-2" },
      el(
        "div",
        {},
        el(
          "div",
          { class: "info-line" },
          icon("roadmap"),
          el("span", {}, r.explanation),
        ),
        el(
          "div",
          { class: "roadmap-list" },
          r.modules.map((m, i) =>
            el(
              "article",
              { class: "roadmap-item" },
              el(
                "div",
                {
                  class:
                    "step-dot" +
                    (["studied", "validated"].includes(m.status)
                      ? " done"
                      : m.id === r.next
                        ? " current"
                        : ""),
                },
                ["studied", "validated"].includes(m.status)
                  ? icon("check")
                  : String(i + 1).padStart(2, "0"),
              ),
              el(
                "div",
                {
                  class:
                    "roadmap-content" + (m.id === r.next ? " current" : ""),
                },
                el(
                  "div",
                  { class: "row between" },
                  el(
                    "div",
                    { class: "grow" },
                    el(
                      "p",
                      { class: "eyebrow" },
                      m.id +
                        " · " +
                        (m.role === "foundation"
                          ? "PRÉREQUIS AJOUTÉ"
                          : "VOTRE OBJECTIF"),
                    ),
                    el("h3", {}, m.title),
                  ),
                  pill(
                    m.status === "validated"
                      ? "Examen validé"
                      : m.status === "studied"
                        ? "Étudié"
                        : m.status === "ready"
                          ? "Prêt à commencer"
                          : "Prérequis à explorer",
                    m.status === "prerequisites" ? "neutral" : "",
                  ),
                ),
                m.missing.length
                  ? el(
                      "p",
                      { class: "muted" },
                      "À consolider avant ce module : " + m.missing.join(", "),
                    )
                  : null,
                el(
                  "div",
                  { class: "row between section-gap" },
                  el("small", {}, m.estimatedHours + " h de contenu estimées"),
                  link(
                    m.status === "studied" ? "Réviser →" : "Ouvrir →",
                    "#study/" + m.id,
                    "small",
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      el(
        "aside",
        { class: "sticky-panel" },
        card(
          el("p", { class: "eyebrow" }, "UNE DIRECTION, PAS UNE ÉCHÉANCE"),
          el("h2", {}, "Votre rythme compte."),
          el("p", { class: "muted" }, r.why),
          progress(r.studied, r.modules.length),
          el(
            "div",
            { class: "metrics-detail" },
            el(
              "div",
              { class: "metric-mini" },
              el("strong", {}, r.studied),
              el("small", {}, "étudiés"),
            ),
            el(
              "div",
              { class: "metric-mini" },
              el("strong", {}, r.validated),
              el("small", {}, "validés"),
            ),
            el(
              "div",
              { class: "metric-mini" },
              el("strong", {}, S.me.profile.weeklyHours + " h"),
              el("small", {}, "par semaine"),
            ),
          ),
          el(
            "p",
            { class: "insight" },
            `${r.remainingHours} heures de contenu estimées, soit environ ${r.weeks} semaines au rythme choisi. Les durées du catalogue restent indicatives et seront affinées.`,
          ),
          link("Ajuster ma disponibilité", "#onboarding", "small"),
        ),
        card(
          el("h3", {}, "Comment lire votre progression ?"),
          el(
            "p",
            { class: "muted" },
            "Étudié : vous avez parcouru le contenu. Validé : une évaluation serveur a été réussie. Les prérequis sont des conseils de lecture ; les examens ont leurs propres conditions d’accès.",
          ),
        ),
      ),
    ),
  ];
}
function catalog() {
  const search = input("search", S.filter, {
      placeholder: "Chercher un module, une notion…",
      class: "search",
      "aria-label": "Rechercher dans le catalogue",
    }),
    school = select(S.school, [
      ["all", "Toutes les disciplines"],
      ...S.catalog.schools.map((s) => [s.id, s.title]),
    ]);
  const list = el("div", { class: "catalog-grid" }),
    count = el("p", { class: "muted" });
  const update = () => {
    S.filter = search.value;
    S.school = school.value;
    const q = S.filter
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const ms = S.catalog.modules.filter(
      (m) =>
        (S.school === "all" || m.school === S.school) &&
        (m.title + " " + m.id + " " + m.topics.join(" "))
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(q),
    );
    count.textContent =
      ms.length +
      " modules · les statuts éditoriaux sont indiqués sur chaque fiche";
    list.replaceChildren(
      ...ms.map((m) =>
        el(
          "article",
          { class: "card course-card" },
          el(
            "div",
            { class: "row between" },
            el("span", { class: "course-code" }, m.id),
            pill(
              m.expandedDraft ? "Chapitre rédigé" : "Programme à enrichir",
              m.expandedDraft ? "" : "neutral",
            ),
          ),
          el("h3", {}, m.title),
          el(
            "p",
            { class: "muted" },
            m.prerequisites.length
              ? "Prérequis : " + m.prerequisites.join(", ")
              : "Accessible sans prérequis formel.",
          ),
          el(
            "small",
            {},
            m.estimatedHours +
              " h indicatives · " +
              (m.level === "foundation"
                ? "Fondations"
                : m.level === "research"
                  ? "Recherche"
                  : "Approfondissement"),
          ),
          link("Explorer ce module →", "#study/" + m.id, "quiet"),
        ),
      ),
    );
  };
  search.addEventListener("input", update);
  school.addEventListener("change", update);
  update();
  return [
    head(
      "Toutes les idées commencent ici.",
      "Explorez les mathématiques, la programmation, la statistique et les sciences de l’IA.",
    ),
    el(
      "div",
      { class: "toolbar" },
      field("Rechercher", search),
      field("Discipline", school),
    ),
    count,
    list,
    S.trainings.length
      ? el(
          "section",
          { class: "section-gap" },
          el("h2", {}, "Formations publiées"),
          el(
            "div",
            { class: "catalog-grid" },
            S.trainings.map((t) =>
              card(
                pill(t.definition.type),
                el("h3", {}, t.definition.title),
                el("p", {}, t.definition.description),
                el("small", {}, t.definition.moduleIds.length + " modules"),
                ...t.definition.moduleIds.map((id) =>
                  link(id + " · " + title(id), "#study/" + id, "quiet small"),
                ),
              ),
            ),
          ),
        )
      : null,
  ];
}
function lineChart(points, label) {
  if (!points.length)
    return empty(
      "Votre courbe se dessinera ici.",
      "Les résultats apparaîtront après vos premières tentatives corrigées.",
    );
  const W = 560,
    H = 190,
    pl = 36,
    pb = 28,
    max = 100;
  const coords = points.map((p, i) => [
    pl + (points.length === 1 ? 0.5 : i / (points.length - 1)) * (W - pl - 14),
    H - pb - (p.value / max) * (H - pb - 12),
  ]);
  return svg(
    "svg",
    {
      viewBox: `0 0 ${W} ${H}`,
      class: "chart",
      role: "img",
      "aria-label": label,
    },
    [0, 50, 100].flatMap((v) => [
      svg("line", {
        x1: pl,
        y1: H - pb - (v / max) * (H - pb - 12),
        x2: W - 12,
        y2: H - pb - (v / max) * (H - pb - 12),
      }),
      svg(
        "text",
        { x: 1, y: H - pb - (v / max) * (H - pb - 12) + 4 },
        String(v),
      ),
    ]),
    svg("polyline", { points: coords.map((p) => p.join(",")).join(" ") }),
    coords.flatMap(([x, y], i) => [
      svg("circle", { cx: x, cy: y, r: 3.5 }),
      svg("text", { x, y: H - 5, "text-anchor": "middle" }, points[i].label),
    ]),
  );
}
function results() {
  if (!S.me) return welcome();
  const attempts = S.me.attempts,
    graded = attempts
      .filter((x) => x.score !== null && x.score !== undefined)
      .slice()
      .reverse(),
    passed = S.me.passes;
  const chartPoints = graded
    .slice(-8)
    .map((a) => ({ label: a.exam_id, value: a.score }));
  return [
    head(
      "Comprendre votre progression.",
      "Vos tentatives, vos acquis et vos prochaines pistes de travail.",
      link("Ouvrir les évaluations", "/exam", "primary"),
    ),
    el(
      "div",
      { class: "stats" },
      stat(
        "Examens réussis",
        passed.length,
        "validations enregistrées côté serveur",
        "check",
      ),
      stat(
        "Tentatives corrigées",
        graded.length,
        "chaque essai contribue au bilan",
        "progress",
      ),
      stat(
        "Meilleure note",
        graded.length ? Math.max(...graded.map((x) => x.score)) + " %" : "—",
        "sur les tentatives affichées",
        "catalog",
      ),
      stat(
        "Modules étudiés",
        S.me.learning.filter((x) => x.self_reported_completed).length,
        "lecture déclarée, distincte des résultats",
        "notes",
      ),
    ),
    el(
      "div",
      { class: "grid cols-2" },
      card(
        sectionHead("Vos dernières évaluations", pill("NOTE / 100", "neutral")),
        lineChart(
          chartPoints,
          "Notes des huit dernières tentatives, de 0 à 100",
        ),
        el(
          "p",
          { class: "insight" },
          "Une moyenne ne résume pas votre maîtrise. Comparez les tentatives d’un même module et revenez sur les erreurs avant de poursuivre.",
        ),
      ),
      card(
        el("h2", {}, "Des étapes exigeantes, explicites."),
        el(
          "p",
          { class: "muted" },
          "Le pilote Inférence statistique utilise quatre examens de module, puis une épreuve finale et un projet relu.",
        ),
        el(
          "div",
          { class: "mini-step" },
          pill("80 %"),
          el("small", {}, "Seuil des examens de module"),
        ),
        el(
          "div",
          { class: "mini-step" },
          pill("85 %"),
          el("small", {}, "Final, avec un minimum par domaine"),
        ),
        el(
          "div",
          { class: "mini-step" },
          icon("lock"),
          el(
            "small",
            {},
            "La banque de questions doit être approuvée avant ouverture.",
          ),
        ),
      ),
    ),
    card(
      sectionHead(
        "Historique des tentatives",
        btn(
          "Exporter mes résultats",
          () => download("mes-resultats.json", { attempts, passes: passed }),
          "small",
        ),
      ),
      attempts.length
        ? table(
            ["Module", "Date", "État", "Note"],
            attempts.map((a) => [
              title(a.exam_id),
              date(a.started_at),
              {
                passed: "Réussi",
                failed: "À retravailler",
                started: "En cours",
                expired: "Temps écoulé",
              }[a.state] || a.state,
              a.score === null ? "—" : a.score + " %",
            ]),
          )
        : empty(
            "Pas encore de tentative.",
            "Vos résultats seront enregistrés ici, y compris les essais non réussis.",
          ),
    ),
    el(
      "p",
      { class: "muted section-gap" },
      "Les attestations prévues sont des attestations privées de réussite. Elles ne sont pas des diplômes universitaires.",
    ),
  ];
}
function table(headers, rows) {
  return el(
    "div",
    { class: "table-wrap" },
    el(
      "table",
      { class: "table" },
      el(
        "thead",
        {},
        el(
          "tr",
          {},
          headers.map((h) => el("th", { scope: "col" }, h)),
        ),
      ),
      el(
        "tbody",
        {},
        rows.map((r) =>
          el(
            "tr",
            {},
            r.map((c) => el("td", {}, c)),
          ),
        ),
      ),
    ),
  );
}
function download(name, value) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = el("a", { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function notes() {
  if (!S.me) return welcome();
  const id = S.catalog.modules.some((m) => m.id === S.param)
    ? S.param
    : S.me.notes[0]?.module_id || S.me.roadmap.next || "A1";
  let note = S.me.notes.find((n) => n.module_id === id);
  const box = el(
    "textarea",
    {
      class: "notes-editor",
      maxlength: 12000,
      "aria-label": "Mes notes pour " + title(id),
      oninput: dirty,
    },
    note?.body || "",
  );
  const status = el(
    "small",
    {},
    note
      ? "Enregistré le " + date(note.updated_at)
      : "Votre première note pour ce module",
  );
  const chooser = select(
    id,
    S.catalog.modules.map((m) => [m.id, m.id + " · " + m.title]),
    { onchange: (e) => go("notes", e.target.value) },
  );
  return [
    head(
      "Les idées qui vous appartiennent.",
      "Reliez les notions, formulez vos questions et conservez vos intuitions.",
      btn(
        "Exporter mon carnet",
        () => download("mon-carnet.json", S.me.notes),
        "small",
      ),
    ),
    el(
      "div",
      { class: "note-layout" },
      el(
        "aside",
        { class: "note-list" },
        S.me.notes.map((n) =>
          el(
            "button",
            {
              class: "note-button" + (n.module_id === id ? " selected" : ""),
              onclick: () => go("notes", n.module_id),
            },
            el("strong", {}, title(n.module_id)),
            el("small", {}, n.body.slice(0, 70) || "Note vide"),
          ),
        ),
        !S.me.notes.length
          ? el(
              "p",
              { class: "muted" },
              "Choisissez un module et commencez votre carnet.",
            )
          : null,
      ),
      card(
        sectionHead(
          "Mon carnet personnel",
          link("Retour au module", "#study/" + id, "quiet small"),
        ),
        field("Module", chooser),
        el("h2", { class: "section-title" }, title(id)),
        field("Écrivez avec vos mots", box),
        el(
          "div",
          { class: "row between section-gap" },
          status,
          btn(
            "Enregistrer la note",
            (e) =>
              action(async () => {
                const r = await api(
                  "/api/workspace/notes/" + id,
                  { body: box.value, revision: note?.revision || 0 },
                  "PUT",
                );
                note = {
                  ...(note || {}),
                  body: box.value,
                  revision: r.revision,
                };
                S.dirty = false;
                await refresh();
                status.textContent = "Enregistré à l’instant";
                notify("Note enregistrée dans votre espace.");
              }, e.currentTarget),
            "primary",
          ),
        ),
      ),
    ),
  ];
}
function blocksView(blocks) {
  return el(
    "div",
    { class: "lesson-body" },
    blocks.map((b) =>
      b.type === "heading"
        ? el("h2", {}, b.text)
        : b.type === "code"
          ? el("pre", {}, el("code", {}, b.text))
          : b.type === "callout"
            ? el("div", { class: "callout" }, b.text)
            : b.type === "link"
              ? el(
                  "a",
                  {
                    class: "resource",
                    href: b.url,
                    target: "_blank",
                    rel: "noopener noreferrer",
                  },
                  icon("file"),
                  b.text,
                  " ↗",
                )
              : b.type === "asset"
                ? b.mime?.startsWith("image/")
                  ? el(
                      "figure",
                      {},
                      el("img", {
                        class: "lesson-image",
                        src: "/api/workspace/assets/" + b.assetId + "?inline=1",
                        alt: b.text,
                        loading: "lazy",
                      }),
                      el("figcaption", {}, b.text),
                    )
                  : el(
                      "a",
                      {
                        class: "resource",
                        href: "/api/workspace/assets/" + b.assetId,
                        target: "_blank",
                        rel: "noopener noreferrer",
                      },
                      icon("download"),
                      b.text,
                    )
                : b.type === "chart"
                  ? el(
                      "figure",
                      {},
                      barChart(b.points, b.text),
                      el("figcaption", { class: "muted" }, b.text),
                    )
                  : el("p", {}, b.text),
    ),
  );
}
function barChart(points, label) {
  const max = Math.max(...points.map((p) => Math.abs(p.value)), 1),
    width = 500,
    space = (width - 50) / points.length,
    zero = 110;
  return svg(
    "svg",
    {
      viewBox: "0 0 500 230",
      class: "chart",
      role: "img",
      "aria-label": label,
    },
    svg("line", { x1: 30, y1: zero, x2: 490, y2: zero }),
    points.flatMap((p, i) => [
      svg("rect", {
        class: "bar",
        x: 35 + i * space,
        y: p.value >= 0 ? zero - (p.value / max) * 85 : zero,
        width: Math.max(2, space - 15),
        height: (Math.abs(p.value) / max) * 85,
      }),
      svg(
        "text",
        {
          x: 35 + i * space,
          y:
            p.value >= 0
              ? zero - (p.value / max) * 85 - 5
              : zero + (Math.abs(p.value) / max) * 85 + 12,
        },
        String(p.value),
      ),
      svg("text", { x: 35 + i * space, y: 222 }, p.label.slice(0, 12)),
    ]),
  );
}
function study() {
  const id = S.param || S.me?.roadmap.next || "A1",
    m = S.catalog.modules.find((x) => x.id === id);
  if (!m)
    return [
      head(
        "Module introuvable.",
        "Retrouvez les cours disponibles dans le catalogue.",
      ),
      link("Explorer", "#catalog"),
    ];
  const lessons = S.lessons.filter((l) => l.module_id === id),
    read = S.me?.learning.some(
      (x) => x.module_id === id && x.self_reported_completed,
    );
  const sessionMinutes = input("number", S.me?.profile.sessionMinutes || 30, {
    min: 1,
    max: 240,
    step: 1,
    "aria-label": "Minutes étudiées",
  });
  return [
    head(
      m.title,
      m.id +
        " · " +
        m.estimatedHours +
        " h indicatives · " +
        (m.prerequisites.length
          ? "Prérequis : " + m.prerequisites.join(", ")
          : "Aucun prérequis formel"),
      btn(
        "Mode concentration",
        () => {
          document.body.classList.toggle("focus");
        },
        "small",
      ),
    ),
    el(
      "div",
      { class: "grid cols-2" },
      card(
        pill("COMPRENDRE, PUIS PRATIQUER"),
        lessons.length
          ? lessons.map((l) =>
              el(
                "article",
                {},
                el("h2", { class: "section-title" }, l.title),
                blocksView(l.blocks),
              ),
            )
          : el(
              "div",
              {},
              el(
                "h2",
                { class: "section-title" },
                "Votre espace de travail pour ce module",
              ),
              el(
                "p",
                { class: "muted" },
                "Le cours existant est disponible dans le Notebook public. Les nouvelles leçons publiées depuis le studio apparaîtront directement ici.",
              ),
              outside("Ouvrir le cours " + id, courseUrl(id)),
              el("h3", { class: "section-title" }, "Notions au programme"),
              el(
                "ul",
                {},
                m.topics.map((t) => el("li", {}, t)),
              ),
              el(
                "p",
                { class: "insight" },
                "Après lecture, expliquez une idée sans regarder le cours. Résolvez ensuite un exercice, puis comparez votre raisonnement au corrigé.",
              ),
            ),
        el(
          "div",
          { class: "row study-actions" },
          S.me
            ? btn(
                read ? "Marquer à revoir" : "Marquer comme étudié",
                (e) =>
                  action(async () => {
                    await api("/api/me/learning/modules/" + id, {
                      completed: !read,
                    });
                    await refresh();
                    render();
                    notify(
                      read
                        ? "Module replacé dans les notions à travailler."
                        : "Lecture enregistrée. La validation d’examen reste distincte.",
                    );
                  }, e.currentTarget),
                "primary",
              )
            : link("Se connecter pour enregistrer", "#join", "primary"),
          link("Prendre des notes", "#notes/" + id, "small"),
        ),
      ),
      el(
        "aside",
        { class: "sticky-panel" },
        card(
          el("h2", {}, "Votre session"),
          el(
            "p",
            { class: "muted" },
            "Un objectif simple : comprendre une idée et savoir la réexpliquer.",
          ),
          field(
            "Temps étudié (minutes)",
            sessionMinutes,
            "Temps déclaré, enregistré une seule fois par clic.",
          ),
          btn(
            "Enregistrer ma session",
            (e) =>
              action(async () => {
                if (!S.me) return go("join");
                if (!sessionMinutes.checkValidity())
                  return sessionMinutes.reportValidity();
                await api("/api/workspace/sessions", {
                  id: crypto.randomUUID(),
                  moduleId: id,
                  minutes: Number(sessionMinutes.value),
                });
                await refresh();
                notify("Session enregistrée.");
              }, e.currentTarget),
            "primary",
          ),
          el("hr", {}),
          link("Ajouter une note →", "#notes/" + id, "quiet"),
          btn(
            "Ajouter aux révisions",
            (e) =>
              action(async () => {
                if (!S.me) return go("join");
                await api("/api/workspace/reviews/" + id + "/add", {});
                await refresh();
                notify("Module ajouté à vos révisions.");
              }, e.currentTarget),
            "small",
          ),
        ),
        el(
          "section",
          { class: "card tutor-card section-gap" },
          el("h3", {}, "Besoin d’une autre explication ?"),
          el(
            "p",
            { class: "muted" },
            "Préparez votre question avec le contexte de ce module. Le tuteur génératif reste à activer.",
          ),
          link("Ouvrir l’assistant →", "#tutor/" + id, "small"),
        ),
        card(
          el("h3", {}, "Vérifier votre compréhension"),
          el(
            "p",
            { class: "muted" },
            ["D3", "D6", "D9", "D13"].includes(id)
              ? "Ce module fait partie du pilote d’évaluation. L’ouverture dépend de la banque relue et des prérequis."
              : "L’évaluation validante de ce module est encore en préparation.",
          ),
          ["D3", "D6", "D9", "D13"].includes(id)
            ? link("Voir les examens", "/exam", "small")
            : pill("ÉVALUATION À PRÉPARER", "neutral"),
        ),
      ),
    ),
  ];
}
function reviews() {
  if (!S.me) return welcome();
  return [
    head(
      "Retrouver, reformuler, retenir.",
      "Une révision courte pour transformer une lecture en connaissance durable.",
    ),
    el(
      "div",
      { class: "info-line" },
      icon("review"),
      el(
        "span",
        {},
        "Fermez vos notes et expliquez la notion de mémoire, puis ouvrez le cours pour vérifier. La facilité déclarée ajuste le prochain rappel ; elle ne valide pas un examen.",
      ),
    ),
    S.me.reviews.length
      ? el(
          "div",
          { class: "grid cols-equal" },
          S.me.reviews.map((r) =>
            card(
              el(
                "div",
                { class: "row between" },
                pill(r.module_id),
                pill(
                  new Date(r.due_at) <= new Date()
                    ? "À revoir"
                    : "Le " + date(r.due_at),
                  new Date(r.due_at) <= new Date() ? "warm" : "neutral",
                ),
              ),
              el("h2", { class: "section-title" }, title(r.module_id)),
              el(
                "p",
                { class: "muted" },
                "Expliquez l’idée centrale, donnez un exemple et identifiez une hypothèse importante.",
              ),
              el(
                "div",
                { class: "row" },
                link("Consulter le module", "#study/" + r.module_id, "small"),
                link("Mes notes", "#notes/" + r.module_id, "quiet small"),
              ),
              el(
                "p",
                { class: "eyebrow section-title" },
                "APRÈS AVOIR ESSAYÉ DE MÉMOIRE",
              ),
              el(
                "div",
                { class: "row" },
                [
                  ["again", "À reprendre"],
                  ["hard", "Difficile"],
                  ["good", "Compris"],
                  ["easy", "Très à l’aise"],
                ].map(([q, l]) =>
                  btn(
                    l,
                    (e) =>
                      action(async () => {
                        await api("/api/workspace/reviews/" + r.module_id, {
                          quality: q,
                        });
                        await refresh();
                        render();
                        notify("Prochain rappel ajusté.");
                      }, e.currentTarget),
                    "small",
                  ),
                ),
              ),
              el("small", {}, r.repetitions + " révisions déclarées"),
            ),
          ),
        )
      : empty(
          "Construisez votre première révision.",
          "Depuis un module, utilisez « Ajouter aux révisions ».",
          link("Explorer mon parcours", "#roadmap", "primary"),
        ),
  ];
}
function onboarding() {
  if (!S.me) return welcome();
  S.draftProfile ??= structuredClone(S.me.profile);
  const p = S.draftProfile;
  const stages = ["Votre objectif", "Votre point de départ", "Votre rythme"];
  const body = el(
    "div",
    { class: "onboarding" },
    el(
      "div",
      { class: "onboard-steps" },
      stages.map((t, i) =>
        el(
          "span",
          { class: S.onboardStep === i ? "active" : "" },
          el("b", { class: "step-dot" }, i + 1),
          t,
        ),
      ),
    ),
  );
  if (S.onboardStep === 0)
    body.append(
      el("h1", {}, "Qu’aimeriez-vous savoir faire ?"),
      el(
        "p",
        { class: "muted" },
        "Choisissez un cap. Vous pourrez le changer sans perdre vos notes ni votre travail.",
      ),
      el(
        "div",
        { class: "grid cols-equal" },
        Object.entries(S.config.goals).map(([id, g]) =>
          el(
            "button",
            {
              class: "choice" + (p.goal === id ? " selected" : ""),
              "aria-pressed": p.goal === id,
              onclick: () => {
                p.goal = id;
                render();
              },
            },
            el("strong", {}, g.title),
            el("small", {}, g.why),
          ),
        ),
      ),
    );
  if (S.onboardStep === 1)
    body.append(
      el("h1", {}, "Partons de là où vous êtes."),
      el(
        "p",
        { class: "muted" },
        "Ce choix personnalise les conseils. Seules les évaluations pourront confirmer la maîtrise.",
      ),
      el(
        "div",
        { class: "form-stack" },
        [
          [
            "beginner",
            "Je construis mes bases",
            "Je souhaite des explications progressives, sans connaissances supposées.",
          ],
          [
            "intermediate",
            "J’ai déjà des repères",
            "Je connais certaines notions et souhaite relier théorie et pratique.",
          ],
          [
            "advanced",
            "Je veux approfondir",
            "Je souhaite aller vers les détails mathématiques et la recherche.",
          ],
        ].map(([id, t, d]) =>
          el(
            "button",
            {
              class: "choice" + (p.level === id ? " selected" : ""),
              "aria-pressed": p.level === id,
              onclick: () => {
                p.level = id;
                render();
              },
            },
            el("strong", {}, t),
            el("small", {}, d),
          ),
        ),
      ),
      el(
        "p",
        { class: "insight" },
        "Les bases connues restent visibles pour vous permettre de les vérifier. Aucune compétence n’est attribuée sur une simple déclaration.",
      ),
    );
  if (S.onboardStep === 2) {
    const hours = input("number", p.weeklyHours, {
        min: 1,
        max: 40,
        step: 1,
        oninput: (e) => (p.weeklyHours = Number(e.target.value)),
      }),
      duration = select(
        String(p.sessionMinutes),
        [15, 30, 45, 60, 90].map((n) => [String(n), n + " minutes"]),
        { onchange: (e) => (p.sessionMinutes = Number(e.target.value)) },
      );
    body.append(
      el("h1", {}, "Un rythme qui tient dans la vraie vie."),
      el(
        "p",
        { class: "muted" },
        "Prévoyez du temps pour comprendre, pratiquer et revoir. Il n’y a aucune pénalité à ralentir.",
      ),
      card(
        el(
          "div",
          { class: "grid cols-equal" },
          field("Heures disponibles par semaine", hours),
          field("Durée d’une session", duration),
        ),
        el("p", { class: "section-title" }, "Mes jours préférés"),
        el(
          "div",
          { class: "day-choices" },
          [
            ["L", 1],
            ["M", 2],
            ["M", 3],
            ["J", 4],
            ["V", 5],
            ["S", 6],
            ["D", 0],
          ].map(([l, d]) =>
            el(
              "button",
              {
                class: p.days.includes(d) ? "selected" : "",
                "aria-label": [
                  "Dimanche",
                  "Lundi",
                  "Mardi",
                  "Mercredi",
                  "Jeudi",
                  "Vendredi",
                  "Samedi",
                ][d],
                "aria-pressed": p.days.includes(d),
                onclick: () => {
                  p.days = p.days.includes(d)
                    ? p.days.filter((x) => x !== d)
                    : [...p.days, d];
                  render();
                },
              },
              l,
            ),
          ),
        ),
        el(
          "div",
          { class: "info-line" },
          "Les jours choisis sont des repères dans votre tableau de bord. Aucun rappel externe n’est envoyé.",
        ),
      ),
    );
  }
  body.append(
    el(
      "div",
      { class: "row between section-gap" },
      S.onboardStep > 0
        ? btn("← Retour", () => {
            S.onboardStep--;
            render();
          })
        : link("Plus tard", "#home", "quiet"),
      S.onboardStep < 2
        ? btn(
            "Continuer →",
            () => {
              S.onboardStep++;
              render();
            },
            "primary",
          )
        : btn(
            "Construire mon parcours",
            (e) =>
              action(async () => {
                if (
                  !p.days.length ||
                  !Number.isInteger(p.weeklyHours) ||
                  p.weeklyHours < 1 ||
                  p.weeklyHours > 40
                )
                  throw Error(
                    "Choisissez au moins un jour et entre 1 et 40 heures par semaine.",
                  );
                await api("/api/workspace/profile", {
                  profile: p,
                  revision: S.me.profileRevision,
                });
                await refresh();
                S.draftProfile = null;
                S.onboardStep = 0;
                go("roadmap");
                notify("Votre parcours est prêt.");
              }, e.currentTarget),
            "primary",
          ),
    ),
  );
  return body;
}
function tutor() {
  if (!S.me) return welcome();
  let id = S.param || S.me.roadmap.next || "A1";
  if (!S.catalog.modules.some((m) => m.id === id)) id = "A1";
  const question = el("textarea", {
      maxlength: 1500,
      required: true,
      minlength: 3,
      placeholder: "Quelle notion souhaitez-vous mieux comprendre ?",
      "aria-label": "Votre question",
    }),
    history = el("div", { class: "chat-history", "aria-live": "polite" });
  function redraw() {
    history.replaceChildren(
      ...S.chat
        .filter((m) => m.moduleId === id)
        .map((m) =>
          el(
            "div",
            { class: "message " + m.role },
            m.text,
            m.sources?.map((s) =>
              el(
                "div",
                {},
                el("strong", {}, s.title),
                el(
                  "p",
                  {},
                  s.excerpt.slice(0, 650) ||
                    "Une ressource liée est disponible dans le module.",
                ),
                el("small", {}, "Version " + s.revision),
                link("Lire dans le module", "#study/" + id, "quiet small"),
              ),
            ),
            m.url ? outside("Ouvrir le Notebook public", m.url) : null,
          ),
        ),
    );
    history.scrollTop = history.scrollHeight;
  }
  const form = el(
    "form",
    {
      class: "composer",
      onsubmit: (e) => {
        e.preventDefault();
        const q = question.value.trim();
        if (q.length < 3) return;
        const b = e.currentTarget.querySelector("button");
        action(async () => {
          S.chat.push({ moduleId: id, role: "user", text: q });
          redraw();
          const r = await api("/api/workspace/tutor", {
            moduleId: id,
            question: q,
          });
          S.chat.push({
            moduleId: id,
            role: "sources",
            text: r.answer,
            sources: r.sources,
            url: r.publicCourse,
          });
          question.value = "";
          redraw();
        }, b);
      },
    },
    field("Votre question", question),
    el(
      "button",
      { type: "submit", class: "btn primary" },
      "Retrouver les sources →",
    ),
  );
  redraw();
  return [
    head(
      "Une aide qui garde le fil.",
      "Le contexte de votre cours, au cœur de votre apprentissage.",
    ),
    el(
      "div",
      { class: "grid cols-2" },
      card(
        sectionHead("Assistant Notebook", pill("IA NON ACTIVÉE", "neutral")),
        field(
          "Module de travail",
          select(
            id,
            S.catalog.modules.map((m) => [m.id, m.id + " · " + m.title]),
            { onchange: (e) => go("tutor", e.target.value) },
          ),
        ),
        el(
          "div",
          { class: "info-line" },
          icon("tutor"),
          el(
            "span",
            {},
            "La recherche de ressources fonctionne. Le modèle génératif n’est pas encore connecté : aucune réponse IA ni correction automatique n’est simulée.",
          ),
        ),
        history,
        el(
          "div",
          { class: "row" },
          [
            "Explique la notion centrale",
            "Donne-moi une piste pour pratiquer",
            "Quelles hypothèses faut-il vérifier ?",
          ].map((t) =>
            el(
              "button",
              {
                class: "prompt-chip",
                onclick: () => {
                  question.value = t;
                  question.focus();
                },
              },
              t,
            ),
          ),
        ),
        form,
      ),
      el(
        "aside",
        {},
        card(
          el("h2", {}, "Le futur tuteur, pensé pour apprendre."),
          el(
            "div",
            { class: "mini-step" },
            icon("search"),
            el(
              "div",
              {},
              el("strong", {}, "Des réponses avec leurs sources"),
              el(
                "small",
                {},
                "Uniquement le contenu publié auquel vous avez accès.",
              ),
            ),
          ),
          el(
            "div",
            { class: "mini-step" },
            icon("roadmap"),
            el(
              "div",
              {},
              el("strong", {}, "Des indices avant la solution"),
              el("small", {}, "Vous aider à raisonner et à tester une idée."),
            ),
          ),
          el(
            "div",
            { class: "mini-step" },
            icon("lock"),
            el(
              "div",
              {},
              el("strong", {}, "Des évaluations indépendantes"),
              el("small", {}, "Aucun accès aux corrigés privés des examens."),
            ),
          ),
        ),
        card(
          el("h3", {}, "Votre point de départ"),
          el("p", { class: "muted" }, title(id)),
          link("Revenir au module", "#study/" + id, "small"),
        ),
      ),
    ),
  ];
}
function plans() {
  let yearly = false;
  const cards = el("div", { class: "grid cols-3" }),
    note = el("p", { class: "muted" }),
    tabs = el("div", {
      class: "tabs",
      role: "group",
      "aria-label": "Période de facturation indicative",
    });
  function update() {
    tabs.replaceChildren(
      ...[
        [false, "Mensuel"],
        [true, "Annuel"],
      ].map(([v, t]) =>
        el(
          "button",
          {
            class: yearly === v ? "selected" : "",
            "aria-pressed": yearly === v,
            onclick: () => {
              yearly = v;
              update();
            },
          },
          t,
        ),
      ),
    );
    note.textContent = yearly
      ? "Montant annuel proposé, payé en une seule fois. Aucune facturation active."
      : "Tarifs mensuels proposés. Aucun abonnement ni prélèvement actif.";
    cards.replaceChildren(
      ...S.offers.map((o, i) =>
        el(
          "section",
          { class: "card plan-card" + (i === 1 ? " featured" : "") },
          pill(
            i === 0
              ? "POUR EXPLORER"
              : i === 1
                ? "POUR PROGRESSER"
                : "POUR APPROFONDIR",
          ),
          el("h2", { class: "section-title" }, o.name),
          el(
            "div",
            { class: "price" },
            euro(yearly ? o.yearly : o.monthly),
            el("small", {}, yearly ? " / an" : " / mois"),
          ),
          el("p", { class: "muted" }, o.description),
          el(
            "ul",
            {},
            el(
              "li",
              {},
              i === 0
                ? "Cours publics et découverte"
                : "Espace personnel et parcours",
            ),
            el(
              "li",
              {},
              i === 0
                ? "Aucune carte bancaire"
                : "Notes, révisions et résultats",
            ),
            el(
              "li",
              {},
              i === 0
                ? "Orientation par objectif"
                : o.aiMessages + " messages IA / mois envisagés",
            ),
          ),
          btn(
            i === 0 ? "Explorer gratuitement" : "Offre en préparation",
            () =>
              i === 0
                ? go("catalog")
                : notify(
                    "Cette offre est provisoire. Aucun paiement n’est activé.",
                  ),
            i === 1 ? "primary" : "",
          ),
          el(
            "p",
            { class: "muted section-gap" },
            el(
              "small",
              {},
              i === 0
                ? "Les ressources ouvertes restent accessibles."
                : "Tutorat IA et évaluations selon disponibilité. Pas de mentorat humain inclus.",
            ),
          ),
        ),
      ),
    );
  }
  update();
  return [
    head(
      "Investir dans ce que vous comprenez.",
      "Une proposition de prix accessible, à valider avant la commercialisation.",
    ),
    pill("TARIFICATION FICTIVE · PRIX TTC ENVISAGÉS", "warm"),
    el("div", { class: "section-gap" }, tabs),
    note,
    cards,
    el(
      "p",
      { class: "insight" },
      "Les cours publics existants restent ouverts. Les offres payantes viseraient le suivi, l’accompagnement et les services supplémentaires, une fois disponibles. Les attestations seraient privées et non accréditées.",
    ),
  ];
}
function settings() {
  if (!S.me) return welcome();
  return [
    head(
      "Votre espace, à votre façon.",
      "Retrouvez votre profil et adaptez vos habitudes de travail.",
    ),
    el(
      "div",
      { class: "grid cols-equal" },
      card(
        el("h2", {}, "Mon profil"),
        el("p", {}, el("strong", {}, S.me.user.name)),
        el("p", { class: "muted" }, S.me.user.email),
        pill(
          S.config.mode === "demo"
            ? "PROFIL DE DÉMONSTRATION"
            : "COMPTE VÉRIFIÉ",
        ),
        el(
          "p",
          { class: "section-title" },
          "Objectif : " + S.config.goals[S.me.profile.goal].title,
        ),
        el(
          "p",
          { class: "muted" },
          S.me.profile.weeklyHours +
            " h par semaine · sessions de " +
            S.me.profile.sessionMinutes +
            " min",
        ),
        link("Ajuster mes préférences", "#onboarding", "primary"),
      ),
      card(
        el("h2", {}, "Mes données"),
        el(
          "p",
          { class: "muted" },
          "Téléchargez vos notes, votre planning déclaré et votre historique d’apprentissage au format JSON.",
        ),
        btn(
          "Exporter mon espace",
          () => download("mon-notebook.json", S.me),
          "small",
        ),
        el("h3", { class: "section-title" }, "Mon abonnement"),
        el("p", { class: "muted" }, "Les offres sont encore en préparation."),
        link("Voir les offres", "#plans", "small"),
        el("h3", { class: "section-title" }, "Ma session"),
        S.config.mode === "demo"
          ? el(
              "small",
              {},
              "L’aperçu utilise un profil de démonstration, sans connexion réelle.",
            )
          : btn(
              "Me déconnecter",
              (e) =>
                action(async () => {
                  await api("/api/auth/sign-out", {});
                  S.me = null;
                  S.lessons = [];
                  S.admin = null;
                  S.chat = [];
                  go("join");
                  render();
                }, e.currentTarget),
              "small",
            ),
      ),
    ),
  ];
}
function authPage() {
  const resetToken = new URLSearchParams(location.search).get("token");
  const reset = Boolean(resetToken),
    register = S.authMode === "register",
    demo = S.config.mode === "demo";
  const name = input("text", "", {
      autocomplete: "name",
      maxlength: 90,
      required: register,
    }),
    email = input("email", "", { autocomplete: "email", required: !reset }),
    pass = input("password", "", {
      autocomplete: register || reset ? "new-password" : "current-password",
      minlength: 12,
      required: true,
    });
  const message = el("p", {
    class: "inline-error",
    role: "status",
    "aria-live": "polite",
  });
  const submit = el(
    "button",
    { class: "btn primary", type: "submit", disabled: demo },
    reset
      ? "Enregistrer le nouveau mot de passe"
      : register
        ? "Créer mon compte gratuit"
        : "Retrouver mon espace",
  );
  const form = el(
    "form",
    {
      class: "form-stack",
      onsubmit: (e) => {
        e.preventDefault();
        action(async () => {
          message.textContent = "";
          if (demo) return;
          if (reset) {
            await api("/api/auth/reset-password", {
              token: resetToken,
              newPassword: pass.value,
            });
            message.textContent =
              "Mot de passe modifié. Vous pouvez vous connecter.";
            history.replaceState({}, "", location.pathname + "#join");
            S.authMode = "login";
            render();
            notify("Mot de passe modifié. Connectez-vous.");
            return;
          }
          if (register) {
            await api("/api/auth/sign-up/email", {
              name: name.value.trim(),
              email: email.value.trim(),
              password: pass.value,
              callbackURL: location.origin + "/onboarding",
            });
            message.textContent =
              "Compte créé. Ouvrez le lien reçu par e-mail pour activer votre espace.";
            pass.value = "";
          } else {
            await api("/api/auth/sign-in/email", {
              email: email.value.trim(),
              password: pass.value,
              callbackURL: location.origin + "/dashboard",
            });
            await refresh();
            S.lessons = (await api("/api/workspace/lessons")).lessons;
            S.trainings = (await api("/api/workspace/trainings")).trainings;
            go(S.me.profile.onboarded ? "home" : "onboarding");
          }
        }, submit).catch(() => {});
      },
    },
    register && !reset ? field("Votre prénom et nom", name) : null,
    !reset ? field("Adresse e-mail", email) : null,
    field(
      "Mot de passe",
      el(
        "div",
        { class: "password-wrap" },
        pass,
        el(
          "button",
          {
            type: "button",
            onclick: (e) => {
              pass.type = pass.type === "password" ? "text" : "password";
              e.currentTarget.textContent =
                pass.type === "password" ? "Afficher" : "Masquer";
            },
          },
          "Afficher",
        ),
      ),
      register || reset
        ? "12 caractères minimum. Vous pouvez utiliser une phrase."
        : null,
    ),
    submit,
    message,
  );
  return el(
    "div",
    { class: "auth-layout" },
    el(
      "aside",
      { class: "auth-story" },
      el("p", { class: "eyebrow" }, "ACHRAF’S NOTEBOOK"),
      el("h2", {}, "Apprendre avec une direction. Avancer avec confiance."),
      el(
        "p",
        {},
        "Un parcours qui s’adapte à votre objectif, un carnet pour vos idées et une vision claire de vos acquis.",
      ),
      art(),
      el(
        "p",
        {},
        "Les premières étapes sont gratuites. Aucune carte bancaire demandée.",
      ),
    ),
    el(
      "section",
      { class: "auth-form" },
      el(
        "h2",
        {},
        reset
          ? "Un nouveau départ."
          : register
            ? "Votre prochaine idée commence ici."
            : "Heureux de vous retrouver.",
      ),
      !reset
        ? el(
            "div",
            { class: "tabs" },
            el(
              "button",
              {
                class: register ? "selected" : "",
                onclick: () => {
                  S.authMode = "register";
                  render();
                },
              },
              "Créer un compte",
            ),
            el(
              "button",
              {
                class: !register ? "selected" : "",
                onclick: () => {
                  S.authMode = "login";
                  render();
                },
              },
              "Se connecter",
            ),
          )
        : null,
      demo
        ? el(
            "div",
            { class: "alert" },
            "Aperçu du parcours d’inscription. La création réelle nécessite le serveur, la base de données et l’envoi d’e-mails configurés. Aucun mot de passe ne sera enregistré ici.",
          )
        : null,
      form,
      !register && !reset
        ? btn(
            "Mot de passe oublié ?",
            () =>
              action(async () => {
                if (!email.checkValidity()) return email.reportValidity();
                if (demo) {
                  notify("Envoi d’e-mail indisponible en démonstration.");
                  return;
                }
                try {
                  await api("/api/auth/request-password-reset", {
                    email: email.value.trim(),
                    redirectTo: location.origin + "/join",
                  });
                } catch {}
                message.textContent =
                  "Si cette adresse correspond à un compte, un lien de réinitialisation sera envoyé.";
              }),
            "quiet small",
          )
        : null,
      !reset
        ? btn(
            "Renvoyer le lien de vérification",
            () =>
              action(async () => {
                if (!email.checkValidity()) return email.reportValidity();
                if (demo) return notify("E-mails désactivés dans cet aperçu.");
                try {
                  await api("/api/auth/send-verification-email", {
                    email: email.value.trim(),
                    callbackURL: location.origin + "/onboarding",
                  });
                } catch {}
                message.textContent =
                  "Si nécessaire, un nouveau lien de vérification sera envoyé.";
              }),
            "quiet small",
          )
        : null,
      el(
        "p",
        { class: "muted section-gap" },
        el(
          "small",
          {},
          "Votre compte donne accès à votre progression personnelle. Les choix de parcours pourront être ajustés après l’inscription.",
        ),
      ),
      link("← Explorer le Notebook", "#catalog", "quiet small"),
    ),
  );
}
let adminTab = "overview",
  adminPage = 0;
async function loadAdmin() {
  S.admin = await api("/api/admin/overview");
}
function adminWorkspace() {
  if (!S.me?.isAdmin)
    return [
      head(
        "Un espace réservé à l’éditeur.",
        "Votre session ne dispose pas des droits administrateur.",
      ),
      link("Retour à mon espace", "#home"),
    ];
  if (!S.admin)
    return [head("Ouverture du studio…", "Chargement du catalogue éditorial.")];
  const tabs = [
    ["overview", "Vue d’ensemble"],
    ["content", "Leçons"],
    ["trainings", "Formations"],
    ["questions", "Évaluations"],
    ["learners", "Apprenants"],
    ["pricing", "Offres & prix"],
    ["business", "Modèle économique"],
  ];
  return [
    head(
      "Le studio du Notebook.",
      "Créez, relisez et publiez une expérience d’apprentissage cohérente.",
      pill(
        S.config.mode === "demo"
          ? "STUDIO DE DÉMONSTRATION"
          : "ACCÈS ADMINISTRATEUR",
      ),
    ),
    el(
      "div",
      { class: "tabs", role: "tablist", "aria-label": "Sections du studio" },
      tabs.map(([id, t]) =>
        el(
          "button",
          {
            role: "tab",
            "aria-selected": adminTab === id,
            class: adminTab === id ? "selected" : "",
            onclick: () => {
              if (!leave()) return;
              adminTab = id;
              S.editing = null;
              render();
            },
          },
          t,
        ),
      ),
    ),
    adminTab === "overview"
      ? adminOverview()
      : adminTab === "content"
        ? adminContent()
        : adminTab === "trainings"
          ? adminTrainings()
          : adminTab === "questions"
            ? adminQuestions()
            : adminTab === "learners"
              ? adminLearners()
              : adminTab === "pricing"
                ? adminPricing()
                : business(),
  ];
}
function adminOverview() {
  const a = S.admin;
  return el(
    "div",
    {},
    el(
      "div",
      { class: "stats" },
      stat(
        "Modules au catalogue",
        S.catalog.modules.length,
        "catalogue historique conservé",
        "catalog",
      ),
      stat(
        "Leçons du studio",
        a.lessons.length,
        a.lessons.filter((l) => l.status === "published").length + " publiées",
        "notes",
      ),
      stat(
        "Profils personnalisés",
        a.learners,
        S.config.mode === "demo"
          ? "données de démonstration"
          : "profils ayant choisi leur objectif",
        "settings",
      ),
      stat(
        "Questions approuvées",
        a.questions.reduce((n, q) => n + q.approved, 0),
        "banque privée du pilote",
        "check",
      ),
    ),
    el(
      "div",
      { class: "grid cols-2" },
      card(
        sectionHead(
          "Votre atelier éditorial",
          btn(
            "Créer une leçon",
            () => {
              adminTab = "content";
              S.editing = newLesson();
              render();
            },
            "primary",
          ),
        ),
        el(
          "p",
          { class: "muted" },
          "Composez des leçons en blocs, ajoutez des graphiques et des ressources, puis publiez. Les cours historiques restent accessibles depuis chaque module.",
        ),
        el(
          "div",
          { class: "mini-step" },
          icon("notes"),
          el(
            "div",
            {},
            el("strong", {}, "Un brouillon avant publication"),
            el(
              "small",
              {},
              "Un aperçu instantané et un historique à chaque enregistrement.",
            ),
          ),
        ),
        el(
          "div",
          { class: "mini-step" },
          icon("file"),
          el(
            "div",
            {},
            el("strong", {}, "Des supports variés"),
            el(
              "small",
              {},
              "Texte, titres, code, encadrés, données graphiques, images, PDF et liens.",
            ),
          ),
        ),
        el(
          "div",
          { class: "mini-step" },
          icon("lock"),
          el(
            "div",
            {},
            el("strong", {}, "Les accès contrôlés côté serveur"),
            el(
              "small",
              {},
              "Aucun rôle administrateur ne peut être obtenu depuis l’interface.",
            ),
          ),
        ),
      ),
      card(
        el("h2", {}, "Les étapes avant ouverture"),
        el(
          "p",
          { class: "muted" },
          "Les services doivent être configurés et vérifiés sur le serveur de destination.",
        ),
        el(
          "ol",
          {},
          el("li", {}, "Comptes et e-mails de vérification."),
          el("li", {}, "Base de données, migrations et sauvegardes."),
          el("li", {}, "Contenus et banques de questions relus."),
          el("li", {}, "Tuteur IA, coût et quotas testés."),
          el("li", {}, "Offres, droits et paiement raccordés."),
        ),
      ),
    ),
    card(
      sectionHead("Dernières actions", pill("JOURNAL ÉDITORIAL", "neutral")),
      a.audits.length
        ? table(
            ["Action", "Élément", "Date"],
            a.audits.map((a) => [a.action, a.target_id, date(a.created_at)]),
          )
        : empty(
            "Le studio est prêt.",
            "Les publications et modifications seront consignées ici.",
          ),
    ),
  );
}
function newLesson() {
  return {
    id: crypto.randomUUID(),
    moduleId: S.catalog.modules[0].id,
    title: "",
    status: "draft",
    revision: 0,
    blocks: [
      { type: "heading", text: "Ce que vous allez comprendre" },
      {
        type: "text",
        text: "Présentez ici la notion, son intuition et un premier exemple.",
      },
    ],
  };
}
function adminContent() {
  if (S.editing) return lessonEditor();
  return card(
    sectionHead(
      "Toutes les leçons",
      btn(
        "Nouvelle leçon",
        () => {
          S.editing = newLesson();
          render();
        },
        "primary",
      ),
    ),
    el(
      "p",
      { class: "muted" },
      "Les leçons publiées sont visibles aux comptes connectés. Les brouillons restent privés au studio.",
    ),
    S.admin.lessons.length
      ? table(
          ["Leçon", "Module", "État", "Version", ""],
          S.admin.lessons.map((l) => [
            l.title,
            l.module_id,
            pill(
              l.status === "published" ? "Publiée" : "Brouillon",
              l.status === "draft" ? "warm" : "",
            ),
            "v" + l.revision,
            btn(
              "Modifier",
              () =>
                action(async () => {
                  const lesson = await api("/api/admin/lessons/" + l.id);
                  S.editing = { ...lesson, moduleId: lesson.module_id };
                  render();
                }),
              "small",
            ),
          ]),
        )
      : empty(
          "Votre première leçon attend vos idées.",
          "Créez une leçon, choisissez son module et composez ses blocs.",
        ),
  );
}
function lessonEditor() {
  const l = S.editing,
    preview = el("div", { class: "editor-preview" }),
    blocks = el("div", {});
  function previewUpdate() {
    preview.replaceChildren(
      el("p", { class: "eyebrow" }, "APERÇU APPRENANT"),
      el("h2", {}, l.title || "Le titre de votre leçon"),
      blocksView(l.blocks),
    );
  }
  function updateBlockList() {
    blocks.replaceChildren(
      ...l.blocks.map((b, i) => {
        const tools = el(
          "div",
          { class: "row between" },
          pill(
            i +
              1 +
              " · " +
              {
                heading: "Titre",
                text: "Texte",
                callout: "Encadré",
                code: "Code",
                link: "Lien",
                asset: "Fichier",
                chart: "Graphique",
              }[b.type],
            "neutral",
          ),
          el(
            "div",
            { class: "row" },
            btn(
              "↑",
              () => {
                if (i > 0) {
                  [l.blocks[i - 1], l.blocks[i]] = [
                    l.blocks[i],
                    l.blocks[i - 1],
                  ];
                  dirty();
                  updateBlockList();
                  previewUpdate();
                }
              },
              "small",
            ),
            btn(
              "↓",
              () => {
                if (i < l.blocks.length - 1) {
                  [l.blocks[i + 1], l.blocks[i]] = [
                    l.blocks[i],
                    l.blocks[i + 1],
                  ];
                  dirty();
                  updateBlockList();
                  previewUpdate();
                }
              },
              "small",
            ),
            btn(
              "Retirer",
              () => {
                l.blocks.splice(i, 1);
                dirty();
                updateBlockList();
                previewUpdate();
              },
              "small danger",
            ),
          ),
        );
        const content = el("div", { class: "form-stack" });
        const change = (key, val) => {
          b[key] = val;
          dirty();
          previewUpdate();
        };
        if (b.type === "link") {
          content.append(
            field(
              "Libellé",
              input("text", b.text, {
                maxlength: 200,
                oninput: (e) => change("text", e.target.value),
              }),
            ),
            field(
              "Adresse HTTPS",
              input("url", b.url, {
                oninput: (e) => change("url", e.target.value),
              }),
            ),
          );
        } else if (b.type === "asset") {
          content.append(
            field(
              "Description du fichier",
              input("text", b.text, {
                maxlength: 200,
                oninput: (e) => change("text", e.target.value),
              }),
            ),
            el("small", {}, "Fichier enregistré : " + b.assetId),
          );
        } else if (b.type === "chart") {
          content.append(
            field(
              "Titre du graphique",
              input("text", b.text, {
                oninput: (e) => change("text", e.target.value),
              }),
            ),
            field(
              "Données : libellé ; valeur (une ligne par point)",
              el(
                "textarea",
                {
                  onchange: (e) => {
                    const ps = e.target.value
                      .trim()
                      .split("\n")
                      .map((row) => {
                        const [label, v] = row.split(";");
                        return {
                          label: label.trim(),
                          value: Number((v || "").trim().replace(",", ".")),
                        };
                      });
                    if (ps.some((p) => !p.label || !Number.isFinite(p.value))) {
                      notify(
                        "Vérifiez les lignes : libellé ; valeur numérique.",
                      );
                      return;
                    }
                    change("points", ps);
                  },
                },
                b.points.map((p) => p.label + " ; " + p.value).join("\n"),
              ),
            ),
          );
        } else
          content.append(
            field(
              b.type === "code" ? "Code (affiché, jamais exécuté)" : "Contenu",
              el(
                "textarea",
                {
                  maxlength: 14000,
                  oninput: (e) => change("text", e.target.value),
                },
                b.text,
              ),
            ),
          );
        return el("section", { class: "block-editor" }, tools, content);
      }),
    );
  }
  const upload = input("file", "", {
    accept: ".pdf,.png,.jpg,.jpeg",
    onchange: (e) =>
      action(async () => {
        const f = e.target.files[0];
        if (!f) return;
        if (f.size > 8388608)
          throw Error("Fichier trop volumineux : 8 Mo maximum.");
        const response = await fetch("/api/admin/assets", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": f.type },
          body: f,
        });
        const data = await response.json();
        if (!response.ok)
          throw Error(errors[data.error] || "Import impossible.");
        l.blocks.push({
          type: "asset",
          assetId: data.id,
          text: f.name,
          mime: data.mime,
        });
        dirty();
        updateBlockList();
        previewUpdate();
        notify("Fichier ajouté. Enregistrez la leçon pour le rattacher.");
      }),
  });
  const save = async (status, b) =>
    action(async () => {
      if (!l.title.trim()) throw Error("Ajoutez un titre à la leçon.");
      const data = await api(
        "/api/admin/lessons/" + l.id,
        { ...l, status },
        "PUT",
      );
      l.revision = data.revision;
      l.status = status;
      S.dirty = false;
      await loadAdmin();
      S.lessons = (await api("/api/workspace/lessons")).lessons;
      render();
      notify(
        status === "published"
          ? "Leçon publiée dans l’espace apprenant."
          : "Brouillon enregistré.",
      );
    }, b);
  const historyButton = btn(
    "Historique",
    () =>
      action(async () => {
        if (!l.revision)
          return notify(
            "L’historique apparaîtra après le premier enregistrement.",
          );
        const h = await api("/api/admin/lessons/" + l.id + "/history");
        modal(
          "Versions de cette leçon",
          el(
            "div",
            {},
            h.history.map((v) =>
              el(
                "div",
                { class: "mini-step" },
                el(
                  "div",
                  { class: "grow" },
                  el(
                    "strong",
                    {},
                    "Version " + v.revision + " · " + v.snapshot.title,
                  ),
                  el("small", {}, date(v.created_at)),
                ),
                btn(
                  "Reprendre",
                  () => {
                    S.editing = {
                      ...v.snapshot,
                      id: l.id,
                      revision: l.revision,
                      status: "draft",
                    };
                    dirty();
                    $("#modal").close();
                    render();
                    notify(
                      "Version chargée en brouillon. Enregistrez pour conserver ce choix.",
                    );
                  },
                  "small",
                ),
              ),
            ),
          ),
        );
      }),
    "small",
  );
  updateBlockList();
  previewUpdate();
  return el(
    "div",
    {},
    el(
      "div",
      { class: "row between admin-head" },
      btn(
        "← Toutes les leçons",
        () => {
          if (!leave()) return;
          S.editing = null;
          render();
        },
        "quiet",
      ),
      el(
        "div",
        { class: "row" },
        pill(
          l.status === "published"
            ? "Publiée · v" + l.revision
            : "Brouillon · v" + l.revision,
          "neutral",
        ),
        historyButton,
        btn(
          "Enregistrer le brouillon",
          (e) => save("draft", e.currentTarget),
          "small",
        ),
        btn(
          "Publier la leçon",
          (e) => save("published", e.currentTarget),
          "primary",
        ),
      ),
    ),
    el(
      "div",
      { class: "editor-columns" },
      el(
        "div",
        { class: "form-stack" },
        field(
          "Titre de la leçon",
          input("text", l.title, {
            maxlength: 160,
            oninput: (e) => {
              l.title = e.target.value;
              dirty();
              previewUpdate();
            },
          }),
        ),
        field(
          "Module rattaché",
          select(
            l.moduleId,
            S.catalog.modules.map((m) => [m.id, m.id + " · " + m.title]),
            {
              onchange: (e) => {
                l.moduleId = e.target.value;
                dirty();
              },
            },
          ),
        ),
        blocks,
        el(
          "div",
          {},
          el("p", { class: "eyebrow" }, "AJOUTER UN BLOC"),
          el(
            "div",
            { class: "block-types" },
            [
              ["heading", "Titre"],
              ["text", "Texte"],
              ["callout", "Encadré"],
              ["code", "Code"],
              ["link", "Lien"],
              ["chart", "Graphique"],
            ].map(([t, n]) =>
              btn(
                "+ " + n,
                () => {
                  l.blocks.push(
                    t === "chart"
                      ? {
                          type: t,
                          text: "Titre du graphique",
                          points: [
                            { label: "A", value: 10 },
                            { label: "B", value: 20 },
                          ],
                        }
                      : t === "link"
                        ? { type: t, text: "Ressource", url: "https://" }
                        : { type: t, text: "" },
                  );
                  dirty();
                  updateBlockList();
                  previewUpdate();
                },
                "small",
              ),
            ),
          ),
        ),
        field(
          "Ajouter un PDF ou une image",
          upload,
          "PDF, PNG ou JPEG · 8 Mo maximum. Le fichier sera proposé en téléchargement.",
        ),
      ),
      el("aside", { class: "sticky-panel" }, preview),
    ),
  );
}
function adminTrainings() {
  if (S.editing?.kind === "training") {
    const t = S.editing;
    const picks = el(
      "div",
      { class: "module-picks" },
      S.catalog.modules.map((m) =>
        el(
          "label",
          { class: "check-label" },
          input("checkbox", "", {
            checked: t.moduleIds.includes(m.id),
            onchange: (e) => {
              t.moduleIds = e.target.checked
                ? [...t.moduleIds, m.id]
                : t.moduleIds.filter((id) => id !== m.id);
              dirty();
            },
          }),
          m.id + " · " + m.title,
        ),
      ),
    );
    return card(
      sectionHead(
        "Composer une formation",
        btn(
          "← Liste",
          () => {
            if (!leave()) return;
            S.editing = null;
            render();
          },
          "small",
        ),
      ),
      el(
        "form",
        {
          class: "form-stack",
          onsubmit: (e) => {
            e.preventDefault();
            action(async () => {
              const r = await api("/api/admin/trainings/" + t.id, t, "PUT");
              t.revision = r.revision;
              S.dirty = false;
              await loadAdmin();
              S.trainings = (await api("/api/workspace/trainings")).trainings;
              S.editing = null;
              render();
              notify("Formation enregistrée.");
            }, e.currentTarget.querySelector("button[type=submit]"));
          },
        },
        field(
          "Titre",
          input("text", t.title, {
            required: true,
            minlength: 3,
            maxlength: 160,
            oninput: (e) => {
              t.title = e.target.value;
              dirty();
            },
          }),
        ),
        field(
          "Description",
          el(
            "textarea",
            {
              required: true,
              minlength: 10,
              maxlength: 2000,
              oninput: (e) => {
                t.description = e.target.value;
                dirty();
              },
            },
            t.description,
          ),
        ),
        el(
          "div",
          { class: "grid cols-equal" },
          field(
            "Type",
            select(
              t.type,
              [
                ["course", "Cours"],
                ["path", "Parcours"],
                ["workshop", "Atelier"],
              ],
              {
                onchange: (e) => {
                  t.type = e.target.value;
                  dirty();
                },
              },
            ),
          ),
          field(
            "Visibilité",
            select(
              t.status,
              [
                ["draft", "Brouillon"],
                ["published", "Publié"],
              ],
              {
                onchange: (e) => {
                  t.status = e.target.value;
                  dirty();
                },
              },
            ),
          ),
        ),
        field(
          "Modules inclus",
          picks,
          "Les modules sont ajoutés dans l’ordre de sélection. Les prérequis restent visibles dans les fiches.",
        ),
        el(
          "button",
          { type: "submit", class: "btn primary" },
          "Enregistrer la formation",
        ),
      ),
    );
  }
  return card(
    sectionHead(
      "Formations et formats",
      btn(
        "Nouvelle formation",
        () => {
          S.editing = {
            kind: "training",
            id: crypto.randomUUID(),
            title: "",
            description: "",
            type: "path",
            status: "draft",
            moduleIds: [],
            revision: 0,
          };
          render();
        },
        "primary",
      ),
    ),
    S.admin.trainings.length
      ? table(
          ["Formation", "Format", "Modules", "État", ""],
          S.admin.trainings.map((t) => [
            t.definition.title,
            t.definition.type,
            t.definition.moduleIds.length,
            t.definition.status,
            btn(
              "Modifier",
              () => {
                S.editing = {
                  ...structuredClone(t.definition),
                  id: t.id,
                  revision: t.revision,
                  kind: "training",
                };
                render();
              },
              "small",
            ),
          ]),
        )
      : empty(
          "Créez vos propres regroupements.",
          "Combinez des modules en cours, parcours et ateliers.",
        ),
  );
}
let bankModule = "D3",
  bankRows = null;
function adminQuestions() {
  const list = el("div", {});
  async function load() {
    try {
      const r = await api("/api/admin/questions/" + bankModule);
      bankRows = r.questions;
      list.replaceChildren(
        bankRows.length
          ? table(
              ["Identifiant", "Type", "État", ""],
              bankRows.map((q) => [
                q.id,
                q.kind,
                q.approved ? "Approuvée" : "Brouillon",
                btn(
                  "Modifier",
                  () => {
                    S.editing = {
                      ...structuredClone(q),
                      revision: q.content_version,
                      kindEditor: "question",
                    };
                    render();
                  },
                  "small",
                ),
              ]),
            )
          : empty(
              "Banque encore vide.",
              "Ajoutez des questions bilingues, des distracteurs plausibles et des explications détaillées.",
            ),
      );
    } catch (e) {
      list.replaceChildren(el("p", { class: "inline-error" }, e.message));
    }
  }
  if (S.editing?.kindEditor === "question") return questionEditor();
  load();
  return card(
    sectionHead(
      "Banque privée des examens",
      btn(
        "Nouvelle question",
        () => {
          S.editing = {
            kindEditor: "question",
            id: bankModule + "." + crypto.randomUUID().slice(0, 8),
            module_id: bankModule,
            kind: "choice",
            prompt_fr: "",
            prompt_en: "",
            options_fr: ["", "", ""],
            options_en: ["", "", ""],
            secret_answer: { value: 0 },
            explanation_fr: "",
            explanation_en: "",
            difficulty: 3,
            approved: false,
            revision: 0,
          };
          render();
        },
        "primary",
      ),
    ),
    field(
      "Module pilote",
      select(
        bankModule,
        [
          ["D3", "D3 · Probabilités jointes"],
          ["D6", "D6 · Intervalles de confiance"],
          ["D9", "D9 · Régression logistique"],
          ["D13", "D13 · MCMC"],
        ],
        {
          onchange: (e) => {
            bankModule = e.target.value;
            load();
          },
        },
      ),
    ),
    el(
      "p",
      { class: "insight" },
      "Visez au moins 16 items par module, dont 4 numériques et 8 de difficulté 3 ou plus. Une banque exposée publiquement ne doit pas servir d’examen privé.",
    ),
    list,
  );
}
function questionEditor() {
  const q = S.editing;
  const bind = (k, node) => {
    node.addEventListener("input", () => {
      q[k] = node.value;
      dirty();
    });
    return node;
  };
  const approved = input("checkbox", "", {
    checked: q.approved,
    onchange: (e) => {
      q.approved = e.target.checked;
      dirty();
    },
  });
  return card(
    sectionHead(
      "Écrire une question",
      btn(
        "← Banque",
        () => {
          if (!leave()) return;
          S.editing = null;
          render();
        },
        "small",
      ),
    ),
    el(
      "form",
      {
        class: "form-stack",
        onsubmit: (e) => {
          e.preventDefault();
          action(async () => {
            const r = await api("/api/admin/questions/" + q.id, q, "PUT");
            q.revision = r.content_version;
            S.dirty = false;
            await loadAdmin();
            S.editing = null;
            render();
            notify("Question enregistrée dans la banque privée.");
          }, e.currentTarget.querySelector("button[type=submit]"));
        },
      },
      el(
        "div",
        { class: "row" },
        pill(q.id),
        pill("VERSION " + q.revision, "neutral"),
      ),
      el(
        "div",
        { class: "grid cols-equal" },
        field(
          "Type",
          select(
            q.kind,
            [
              ["choice", "Choix multiple"],
              ["number", "Réponse numérique"],
            ],
            {
              onchange: (e) => {
                q.kind = e.target.value;
                q.options_fr = q.kind === "choice" ? ["", "", ""] : null;
                q.options_en = q.kind === "choice" ? ["", "", ""] : null;
                q.secret_answer =
                  q.kind === "number"
                    ? { value: 0, absoluteTolerance: 0.01 }
                    : { value: 0 };
                dirty();
                render();
              },
            },
          ),
        ),
        field(
          "Difficulté / 5",
          select(
            String(q.difficulty),
            [1, 2, 3, 4, 5].map((n) => [String(n), String(n)]),
            {
              onchange: (e) => {
                q.difficulty = Number(e.target.value);
                dirty();
              },
            },
          ),
        ),
      ),
      el(
        "div",
        { class: "grid cols-equal" },
        field(
          "Énoncé français · 40 caractères minimum",
          bind(
            "prompt_fr",
            el("textarea", { required: true, minlength: 40 }, q.prompt_fr),
          ),
        ),
        field(
          "Énoncé anglais · 40 caractères minimum",
          bind(
            "prompt_en",
            el("textarea", { required: true, minlength: 40 }, q.prompt_en),
          ),
        ),
      ),
      q.kind === "choice"
        ? el(
            "div",
            { class: "grid cols-equal" },
            field(
              "Choix français · une réponse par ligne",
              el(
                "textarea",
                {
                  required: true,
                  oninput: (e) => {
                    q.options_fr = e.target.value.split("\n");
                    dirty();
                  },
                },
                q.options_fr.join("\n"),
              ),
            ),
            field(
              "Choix anglais · dans le même ordre",
              el(
                "textarea",
                {
                  required: true,
                  oninput: (e) => {
                    q.options_en = e.target.value.split("\n");
                    dirty();
                  },
                },
                q.options_en.join("\n"),
              ),
            ),
          )
        : null,
      field(
        q.kind === "choice"
          ? "Numéro de la bonne réponse (à partir de 1)"
          : "Valeur attendue",
        input(
          "number",
          q.kind === "choice"
            ? q.secret_answer.value + 1
            : q.secret_answer.value,
          {
            required: true,
            step: q.kind === "choice" ? 1 : "any",
            min: q.kind === "choice" ? 1 : undefined,
            oninput: (e) => {
              q.secret_answer.value =
                Number(e.target.value) - (q.kind === "choice" ? 1 : 0);
              dirty();
            },
          },
        ),
      ),
      q.kind === "number"
        ? field(
            "Tolérance absolue (entre 0 et 1)",
            input("number", q.secret_answer.absoluteTolerance, {
              min: 0,
              max: 1,
              step: "any",
              required: true,
              oninput: (e) => {
                q.secret_answer.absoluteTolerance = Number(e.target.value);
                dirty();
              },
            }),
          )
        : null,
      el(
        "div",
        { class: "grid cols-equal" },
        field(
          "Explication française · 40 caractères minimum",
          bind(
            "explanation_fr",
            el("textarea", { required: true, minlength: 40 }, q.explanation_fr),
          ),
        ),
        field(
          "Explication anglaise · 40 caractères minimum",
          bind(
            "explanation_en",
            el("textarea", { required: true, minlength: 40 }, q.explanation_en),
          ),
        ),
      ),
      el(
        "label",
        { class: "check-label" },
        approved,
        "J’ai relu les hypothèses, la réponse et les distracteurs. Activer cette question dans les examens.",
      ),
      el(
        "small",
        {},
        "Toute modification crée une nouvelle version. Les tentatives déjà commencées conservent leur propre jeu de questions.",
      ),
      el(
        "button",
        { type: "submit", class: "btn primary" },
        "Enregistrer la question",
      ),
    ),
  );
}
function adminLearners() {
  const out = el("div", {}, el("p", { class: "muted" }, "Chargement…"));
  action(async () => {
    const r = await api("/api/admin/learners?page=" + adminPage);
    out.replaceChildren(
      r.learners.length
        ? table(
            ["Apprenant", "Objectif", "Étudiés", "Examens réussis"],
            r.learners.map((l) => [
              el("div", {}, el("strong", {}, l.name), el("small", {}, l.email)),
              S.config.goals[l.preferences.goal]?.title || l.preferences.goal,
              l.studied,
              l.passed,
            ]),
          )
        : empty(
            "Aucun profil sur cette page.",
            "Les apprenants apparaissent après avoir personnalisé leur parcours.",
          ),
    );
  });
  return card(
    sectionHead(
      "Suivi des apprenants",
      pill("PAGE " + (adminPage + 1), "neutral"),
    ),
    el(
      "p",
      { class: "muted" },
      "Progression déclarée et résultats validés. Le carnet personnel des apprenants n’est pas exposé dans cette liste.",
    ),
    out,
    el(
      "div",
      { class: "row section-gap" },
      btn(
        "← Précédent",
        () => {
          adminPage = Math.max(0, adminPage - 1);
          render();
        },
        "small",
      ),
      btn(
        "Suivant →",
        () => {
          adminPage++;
          render();
        },
        "small",
      ),
    ),
  );
}
function adminPricing() {
  const offers = structuredClone(S.admin.offers);
  return card(
    sectionHead(
      "Vos offres, sous votre contrôle",
      pill("PRIX PROPOSÉS · VENTES INACTIVES", "warm"),
    ),
    el(
      "p",
      { class: "muted" },
      "Ces réglages modifient les fiches d’offres. Ils ne créent aucun tarif Stripe et ne déclenchent aucun débit.",
    ),
    el(
      "form",
      {
        class: "form-stack",
        onsubmit: (e) => {
          e.preventDefault();
          action(async () => {
            await api(
              "/api/admin/offers",
              { offers, revision: S.admin.offersRevision },
              "PUT",
            );
            S.dirty = false;
            await loadAdmin();
            S.offers = S.admin.offers;
            render();
            notify("Proposition tarifaire enregistrée.");
          }, e.currentTarget.querySelector("button[type=submit]"));
        },
      },
      offers.map((o) =>
        el(
          "section",
          { class: "block-editor" },
          field(
            "Nom de l’offre",
            input("text", o.name, {
              required: true,
              maxlength: 40,
              oninput: (e) => {
                o.name = e.target.value;
                dirty();
              },
            }),
          ),
          el(
            "div",
            { class: "grid cols-3" },
            field(
              "Prix mensuel proposé (€)",
              input("number", o.monthly, {
                min: 0,
                max: 1000,
                step: 0.01,
                disabled: o.id === "open",
                required: true,
                oninput: (e) => {
                  o.monthly = Number(e.target.value);
                  dirty();
                },
              }),
            ),
            field(
              "Prix annuel proposé (€)",
              input("number", o.yearly, {
                min: 0,
                max: 1000,
                step: 0.01,
                disabled: o.id === "open",
                required: true,
                oninput: (e) => {
                  o.yearly = Number(e.target.value);
                  dirty();
                },
              }),
            ),
            field(
              "Quota IA envisagé / mois",
              input("number", o.aiMessages, {
                min: 0,
                max: 5000,
                step: 1,
                required: true,
                oninput: (e) => {
                  o.aiMessages = Number(e.target.value);
                  dirty();
                },
              }),
            ),
          ),
          field(
            "Description",
            el(
              "textarea",
              {
                required: true,
                maxlength: 300,
                oninput: (e) => {
                  o.description = e.target.value;
                  dirty();
                },
              },
              o.description,
            ),
          ),
        ),
      ),
      el(
        "button",
        { type: "submit", class: "btn primary" },
        "Enregistrer les offres",
      ),
    ),
  );
}
function business() {
  const model = {
    learners: 200,
    academyShare: 35,
    annualShare: 30,
    vat: 21,
    paymentPct: 2,
    paymentFixed: 0.25,
    aiCost: 0.8,
    supportCost: 1.5,
    fixed: 100,
    churn: 6,
    cac: 12,
  };
  const result = el("div", {});
  const calculate = () => {
    const a = model.academyShare / 100,
      y = model.annualShare / 100,
      p = S.admin.offers;
    const campus = p.find((o) => o.id === "campus"),
      academy = p.find((o) => o.id === "academy");
    const gross =
      (1 - a) * ((1 - y) * campus.monthly + (y * campus.yearly) / 12) +
      a * ((1 - y) * academy.monthly + (y * academy.yearly) / 12);
    const net = gross / (1 + model.vat / 100),
      fees =
        (gross * model.paymentPct) / 100 +
        model.paymentFixed * (1 - y + y / 12),
      unit = net - fees - model.aiCost - model.supportCost,
      monthly = unit * model.learners - model.fixed,
      replacement = ((model.learners * model.churn) / 100) * model.cac;
    result.replaceChildren(
      el(
        "div",
        { class: "grid cols-equal" },
        ...[
          [euro(gross), "Revenu mensuel brut / abonné"],
          [euro(unit), "Contribution / abonné avant acquisition"],
          [
            unit > 0 ? Math.ceil(model.fixed / unit) : "Non atteint",
            "Abonnés pour couvrir les coûts fixes",
          ],
          [
            euro(monthly - replacement),
            "Solde mensuel après remplacement du churn",
          ],
        ].map(([v, l]) =>
          el(
            "div",
            { class: "business-metric" },
            el("strong", {}, v),
            el("small", {}, l),
          ),
        ),
      ),
      el(
        "p",
        { class: "insight" },
        "Simulation, pas prévision : le solde exclut votre rémunération, le temps de production des cours, les impôts sur le bénéfice, les remboursements et la croissance. Le taux de TVA est une hypothèse à confirmer.",
      ),
      table(
        ["Indicateur", "Hypothèse calculée"],
        [
          ["Revenu mensuel brut", euro(gross * model.learners)],
          ["Coûts fixes / mois", euro(model.fixed)],
          ["Acquisition de remplacement / mois", euro(replacement)],
          [
            "Récupération du coût d’acquisition",
            unit > 0 ? fmt(model.cac / unit) + " mois" : "Non atteinte",
          ],
          [
            "Contribution vie client simplifiée",
            model.churn > 0
              ? euro(unit / (model.churn / 100))
              : "Non calculable sans attrition",
          ],
        ],
      ),
    );
  };
  calculate();
  return el(
    "div",
    { class: "grid cols-equal" },
    card(
      el("h2", {}, "Tester la viabilité avant de vendre."),
      el(
        "p",
        { class: "muted" },
        "Modifiez les hypothèses. Les prix proviennent des offres enregistrées.",
      ),
      el(
        "div",
        { class: "grid cols-equal" },
        [
          ["learners", "Abonnés payants", 0, 100000, 1],
          ["academyShare", "Part Academy (%)", 0, 100, 1],
          ["annualShare", "Part annuelle (%)", 0, 100, 1],
          ["vat", "TVA supposée (%)", 0, 30, 0.1],
          ["paymentPct", "Frais variables (%)", 0, 10, 0.1],
          ["paymentFixed", "Frais fixes / transaction (€)", 0, 5, 0.01],
          ["aiCost", "Coût IA / abonné / mois (€)", 0, 50, 0.1],
          ["supportCost", "Support / abonné / mois (€)", 0, 50, 0.1],
          ["fixed", "Coûts fixes / mois (€)", 0, 10000, 1],
          ["churn", "Attrition mensuelle (%)", 0, 100, 0.5],
          ["cac", "Coût acquisition / abonné (€)", 0, 1000, 1],
        ].map(([k, l, min, max, step]) =>
          field(
            l,
            input("number", model[k], {
              min,
              max,
              step,
              oninput: (e) => {
                if (e.target.checkValidity() && e.target.value !== "") {
                  model[k] = Number(e.target.value);
                  calculate();
                }
              },
            }),
          ),
        ),
      ),
    ),
    card(
      el("h2", {}, "Votre scénario économique"),
      result,
      el(
        "h3",
        { class: "section-title" },
        "Une offre à prouver, pas une promesse",
      ),
      el(
        "p",
        { class: "muted" },
        "Commencer par un parcours statistique complet et une cohorte pilote. Mesurer l’activation, la rétention à 4 semaines et la progression aux évaluations avant d’investir en acquisition.",
      ),
      outside(
        "Étude et hypothèses détaillées",
        "https://github.com/Achraf-Saidi/Achraf-Saidi.github.io/blob/feature/notebook-learning-workspace-20261118/achraf-notebooks/platform/docs/WORKSPACE_PRODUCT_PLAN.md",
      ),
    ),
  );
}
async function route() {
  const [v, p] = location.hash.slice(1).split("/");
  const pathView = location.pathname.slice(1);
  S.view = labels[v]
    ? v
    : v === "specializations"
      ? "catalog"
      : v === "exams"
        ? "progress"
        : pathView === "account" || pathView === "join"
          ? "join"
          : location.pathname === "/admin"
            ? "admin"
            : location.pathname === "/onboarding"
              ? "onboarding"
              : labels[pathView]
                ? pathView
                : "home";
  S.param = p ? decodeURIComponent(p) : "";
  document.title = labels[S.view] + " · Achraf’s Notebook";
  if (S.view === "admin" && S.me?.isAdmin) {
    try {
      await loadAdmin();
    } catch (e) {
      notify(e.message);
    }
  }
  if (S.view === "study" && S.me) {
    try {
      const id = S.param || S.me.roadmap.next || "A1";
      const data = await api(
        "/api/workspace/lessons?module=" + encodeURIComponent(id),
      );
      S.lessons = [
        ...S.lessons.filter((l) => l.module_id !== id),
        ...data.lessons,
      ];
    } catch (e) {
      notify(e.message);
    }
  }
  render();
  $("#main")?.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}
function render() {
  const pages = {
    home,
    roadmap,
    catalog,
    progress: results,
    notes,
    review: reviews,
    study,
    onboarding,
    tutor,
    plans,
    settings,
    join: authPage,
    admin: adminWorkspace,
  };
  try {
    shell(pages[S.view]());
  } catch (e) {
    console.error("Workspace rendering failed", e);
    shell([
      head(
        "Cette vue n’a pas pu s’ouvrir.",
        "Votre travail enregistré est conservé.",
      ),
      btn("Réessayer", () => location.reload(), "primary"),
    ]);
  }
}
async function start() {
  try {
    if (localStorage.getItem("notebook-workspace-theme") === "dark")
      document.documentElement.classList.add("dark");
  } catch {}
  try {
    [S.config, S.catalog] = await Promise.all([
      api("/api/workspace/config"),
      api("/api/learning/catalog?lang=fr"),
    ]);
    const offers = await api("/api/workspace/offers");
    S.offers = offers.offers;
    try {
      await refresh();
      [S.lessons, S.trainings] = await Promise.all([
        api("/api/workspace/lessons").then((x) => x.lessons),
        api("/api/workspace/trainings").then((x) => x.trainings),
      ]);
    } catch (e) {
      if (e.status === 401) {
        S.me = null;
      } else throw e;
    }
    await route();
  } catch (e) {
    $("#app").replaceChildren(
      el(
        "main",
        {},
        head(
          "Le Notebook attend son serveur.",
          "L’espace connecté nécessite le serveur de la plateforme et sa base de données.",
        ),
        el("p", { class: "muted" }, e.message),
        btn("Réessayer", () => location.reload(), "primary"),
        outside(
          "Ouvrir les cours publics",
          "https://achraf-saidi.github.io/achraf-notebooks/academy/fr/",
        ),
      ),
    );
  }
}
window.addEventListener("hashchange", route);
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    if (S.catalog) searchModal();
  }
  if (e.key === "Escape") document.body.classList.remove("menu-open");
});
start();
