import { MODULE_INDEX } from "../learning/module-index.mjs";
import { SPECIALIZATIONS } from "../learning/catalog.mjs";
export const GOALS = {
  foundations: {
    title: "Comprendre les bases",
    track: "mathematical-foundations",
    why: "Construire un socle mathématique progressif.",
  },
  data: {
    title: "Devenir data scientist",
    track: "machine-learning",
    why: "Relier programmation, statistiques et validation de modèles.",
  },
  llm: {
    title: "Construire des systèmes IA",
    track: "deep-learning-llm",
    why: "Comprendre les réseaux, l’attention et les modèles de langage.",
  },
  research: {
    title: "Faire de la recherche",
    track: "biomedical-research-ai",
    why: "Associer inférence, méthodologie et applications biomédicales.",
  },
  stats: {
    title: "Réussir en statistiques",
    track: "statistical-inference",
    why: "Travailler les probabilités et le raisonnement statistique.",
  },
  robotics: {
    title: "Créer des robots",
    track: "robotics-embodied",
    why: "Relier perception, commande et réalisation de systèmes.",
  },
  decision: {
    title: "Optimiser les décisions",
    track: "reinforcement-optimization",
    why: "Passer de l’optimisation aux politiques de décision.",
  },
};
export const DEFAULT_PROFILE = {
  goal: "data",
  level: "beginner",
  weeklyHours: 5,
  sessionMinutes: 30,
  days: [1, 3, 5],
  onboarded: false,
};
export function profileInput(x) {
  if (
    !x ||
    !GOALS[x.goal] ||
    !["beginner", "intermediate", "advanced"].includes(x.level) ||
    !Number.isInteger(x.weeklyHours) ||
    x.weeklyHours < 1 ||
    x.weeklyHours > 40 ||
    ![15, 30, 45, 60, 90].includes(x.sessionMinutes) ||
    !Array.isArray(x.days) ||
    !x.days.length ||
    x.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6) ||
    new Set(x.days).size !== x.days.length
  )
    throw Error("invalid_profile");
  return {
    goal: x.goal,
    level: x.level,
    weeklyHours: x.weeklyHours,
    sessionMinutes: x.sessionMinutes,
    days: x.days,
    onboarded: true,
  };
}
export function makeRoadmap(
  profile = DEFAULT_PROFILE,
  studied = [],
  passed = [],
  index = MODULE_INDEX,
  tracks = SPECIALIZATIONS,
) {
  const goal = GOALS[profile.goal] || GOALS.data,
    track = tracks.find((t) => t.id === goal.track);
  const seen = new Set(),
    visiting = new Set(),
    ordered = [];
  const visit = (id) => {
    if (seen.has(id)) return;
    if (visiting.has(id)) throw Error("prerequisite_cycle");
    if (!index[id]) throw Error("prerequisite_missing");
    visiting.add(id);
    for (const p of index[id].prerequisites) visit(p);
    visiting.delete(id);
    seen.add(id);
    ordered.push(id);
  };
  track.modules.forEach(visit);
  const read = new Set(studied),
    verified = new Set(passed),
    targets = new Set(track.modules);
  const modules = ordered.map((id) => {
    const m = index[id],
      prerequisites = m.prerequisites || [];
    const missing = prerequisites.filter(
      (p) => !read.has(p) && !verified.has(p),
    );
    return {
      ...m,
      title: m.title.fr,
      role: targets.has(id) ? "goal" : "foundation",
      status: verified.has(id)
        ? "validated"
        : read.has(id)
          ? "studied"
          : missing.length
            ? "prerequisites"
            : "ready",
      missing,
    };
  });
  const totalHours = modules.reduce((n, m) => n + m.estimatedHours, 0),
    remainingHours = modules
      .filter((m) => !read.has(m.id) && !verified.has(m.id))
      .reduce((n, m) => n + m.estimatedHours, 0);
  return {
    trackId: track.id,
    title: track.name.fr,
    why: goal.why,
    modules,
    totalHours,
    remainingHours,
    weeks: Math.ceil(remainingHours / profile.weeklyHours),
    next: modules.find((m) => m.status === "ready")?.id || null,
    studied: modules.filter((m) => ["studied", "validated"].includes(m.status))
      .length,
    validated: modules.filter((m) => m.status === "validated").length,
    explanation:
      profile.level === "beginner"
        ? "Les prérequis ont été ajoutés pour démarrer progressivement."
        : "Le niveau déclaré adapte les conseils ; il ne valide ni ne supprime un prérequis. Les bases déjà connues peuvent être relues rapidement.",
  };
}
export function safeUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
}
const text = (value, max, min = 0) =>
  typeof value === "string" &&
  value.trim().length >= min &&
  value.length <= max;
export function validateLesson(x) {
  if (
    !x ||
    !MODULE_INDEX[x.moduleId] ||
    !text(x.title, 160, 3) ||
    !["draft", "published"].includes(x.status) ||
    !Array.isArray(x.blocks) ||
    x.blocks.length < 1 ||
    x.blocks.length > 60
  )
    throw Error("invalid_lesson");
  const blocks = x.blocks.map((b) => {
    if (
      !b ||
      ![
        "heading",
        "text",
        "callout",
        "code",
        "link",
        "asset",
        "chart",
      ].includes(b.type)
    )
      throw Error("invalid_block");
    if (b.type === "link") {
      const url = safeUrl(b.url);
      if (!url || !text(b.text, 200, 1)) throw Error("invalid_link");
      return { type: b.type, text: b.text, url };
    }
    if (b.type === "asset") {
      if (!/^[0-9a-f-]{36}$/.test(b.assetId) || !text(b.text, 200, 1))
        throw Error("invalid_asset");
      return { type: b.type, assetId: b.assetId, text: b.text };
    }
    if (b.type === "chart") {
      if (
        !text(b.text, 200, 1) ||
        !Array.isArray(b.points) ||
        b.points.length < 2 ||
        b.points.length > 100 ||
        b.points.some(
          (p) =>
            !text(p.label, 40, 1) ||
            typeof p.value !== "number" ||
            !Number.isFinite(p.value),
        )
      )
        throw Error("invalid_chart");
      return { type: b.type, text: b.text, points: b.points };
    }
    if (!text(b.text, 14000, 1)) throw Error("invalid_block_text");
    return { type: b.type, text: b.text };
  });
  return {
    moduleId: x.moduleId,
    title: x.title.trim(),
    status: x.status,
    blocks,
  };
}
export const DEFAULT_OFFERS = [
  {
    id: "open",
    name: "Découverte",
    monthly: 0,
    yearly: 0,
    description: "Cours ouverts, orientation et découverte du Notebook.",
    aiMessages: 0,
  },
  {
    id: "campus",
    name: "Campus",
    monthly: 4.9,
    yearly: 49,
    description:
      "Parcours personnel, notes, révisions et suivi des évaluations disponibles.",
    aiMessages: 30,
  },
  {
    id: "academy",
    name: "Academy",
    monthly: 9.9,
    yearly: 89,
    description:
      "Tout Campus, projets et quota de tutorat IA prévu après activation.",
    aiMessages: 150,
  },
];
export function validateOffers(x) {
  if (!Array.isArray(x) || x.length !== 3) throw Error("invalid_offers");
  return x.map((p, i) => {
    if (
      p.id !== DEFAULT_OFFERS[i].id ||
      !text(p.name, 40, 1) ||
      !text(p.description, 300, 1) ||
      ![p.monthly, p.yearly].every(
        (v) =>
          typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1000,
      ) ||
      !Number.isInteger(p.aiMessages) ||
      p.aiMessages < 0 ||
      p.aiMessages > 5000 ||
      (p.id === "open" && (p.monthly !== 0 || p.yearly !== 0))
    )
      throw Error("invalid_offers");
    return {
      id: p.id,
      name: p.name.trim(),
      monthly: p.monthly,
      yearly: p.yearly,
      description: p.description.trim(),
      aiMessages: p.aiMessages,
    };
  });
}
export function validateTraining(x) {
  if (
    !x ||
    !text(x.title, 160, 3) ||
    !text(x.description, 2000, 10) ||
    !["course", "path", "workshop"].includes(x.type) ||
    !["draft", "published"].includes(x.status) ||
    !Array.isArray(x.moduleIds) ||
    !x.moduleIds.length ||
    x.moduleIds.length > 151 ||
    new Set(x.moduleIds).size !== x.moduleIds.length ||
    x.moduleIds.some((id) => !MODULE_INDEX[id])
  )
    throw Error("invalid_training");
  return {
    title: x.title.trim(),
    description: x.description.trim(),
    type: x.type,
    status: x.status,
    moduleIds: x.moduleIds,
  };
}
export function reviewInterval(previous, quality) {
  if (!["again", "hard", "good", "easy"].includes(quality))
    throw Error("invalid_review");
  return quality === "again"
    ? 1
    : quality === "hard"
      ? Math.max(1, Math.ceil(previous * 1.2))
      : quality === "good"
        ? Math.min(90, Math.max(3, Math.ceil(previous * 2)))
        : Math.min(180, Math.max(7, previous * 3));
}
export function detectAsset(buffer) {
  if (buffer.subarray(0, 5).toString() === "%PDF-")
    return { mime: "application/pdf", extension: "pdf" };
  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return { mime: "image/png", extension: "png" };
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255)
    return { mime: "image/jpeg", extension: "jpg" };
  return null;
}
