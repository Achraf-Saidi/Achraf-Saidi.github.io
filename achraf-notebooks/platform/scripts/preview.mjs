// Local development only. Never mount this mock identity in production.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { testDatabase } from "../tests/helpers/database.mjs";
import { mountWorkspaceRoutes } from "../src/workspace/routes.mjs";
import { mountLearningRoutes } from "../src/learning/routes.mjs";
import { DEFAULT_PROFILE, GOALS } from "../src/workspace/model.mjs";
if (process.env.NODE_ENV === "production")
  throw Error("Demo preview cannot run in production");
const db = await testDatabase(),
  uid = "preview-owner";
await db.query('INSERT INTO "user"(id,name,email) VALUES($1,$2,$3)', [
  uid,
  "Alex Martin",
  "alex@example.test",
]);
await db.query(
  "INSERT INTO learner_profiles(user_id,preferences) VALUES($1,$2)",
  [uid, JSON.stringify({ ...DEFAULT_PROFILE, onboarded: true })],
);
for (const id of ["C1", "A1", "C2", "A2", "A4", "A6"])
  await db.query(
    "INSERT INTO learning_events(user_id,module_id,self_reported_completed) VALUES($1,$2,TRUE)",
    [uid, id],
  );
await db.query(
  "INSERT INTO learner_notes(user_id,module_id,body) VALUES($1,$2,$3)",
  [
    uid,
    "C2",
    "Une bonne fonction exprime une seule intention.\n\nÀ retenir : distinguer une valeur renvoyée et une valeur affichée.\nQuestion à explorer : quand utiliser un générateur ?",
  ],
);
for (const [i, id] of ["C2", "A2", "A6"].entries())
  await db.query(
    "INSERT INTO learning_reviews(user_id,module_id,due_at) VALUES($1,$2,now()+($3 * interval '1 day'))",
    [uid, id, i - 1],
  );
for (const [i, minutes] of [45, 30, 60, 45].entries())
  await db.query(
    "INSERT INTO learning_sessions(id,user_id,module_id,minutes,studied_at) VALUES($1,$2,'C2',$3,now()-($4*interval '1 day'))",
    [randomUUID(), uid, minutes, i],
  );
for (const [i, score] of [60, 80, 70, 90].entries())
  await db.query(
    "INSERT INTO assessment_attempts(id,user_id,exam_id,locale,public_questions,answer_key,expires_at,state,score,item_count,started_at) VALUES($1,$2,'D3','fr','[]','[]',now(),'failed',$3,10,now()-($4*interval '1 day'))",
    [randomUUID(), uid, score, 8 - i],
  );
const app = express();
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.set("X-Content-Type-Options", "nosniff");
  res.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  );
  next();
});
app.use(express.json({ limit: "1mb" }));
app.get("/api/workspace/config", (_req, res) =>
  res.json({
    mode: "demo",
    goals: GOALS,
    tutor: { enabled: false, mode: "sources" },
    billingEnabled: false,
  }),
);
const session = (req, _res, next) => {
  req.currentUser = {
    id: uid,
    name: "Alex Martin",
    email: "alex@example.test",
    emailVerified: true,
  };
  next();
};
const assertSameOrigin = (req, res, next) => {
  try {
    if (new URL(req.get("origin")).host !== req.get("host"))
      return res.status(403).json({ error: "invalid_origin" });
    next();
  } catch {
    res.status(403).json({ error: "invalid_origin" });
  }
};
app.get("/api/auth/get-session", (_req, res) =>
  res.json({
    user: {
      id: uid,
      name: "Alex Martin",
      email: "alex@example.test",
      emailVerified: true,
    },
  }),
);
app.all("/api/auth/{*any}", (_req, res) =>
  res.status(503).json({ error: "demo_auth_disabled" }),
);
mountWorkspaceRoutes(app, { db, session, assertSameOrigin, adminIds: uid });
mountLearningRoutes(app, { db, session, assertSameOrigin });
const publicRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public",
);
app.use("/assets", express.static(path.join(publicRoot, "assets")));
app.get(["/exam", "/learning"], (_req, res) =>
  res.sendFile(path.join(publicRoot, "learning.html")),
);
app.get("/{*any}", (_req, res) =>
  res.sendFile(path.join(publicRoot, "workspace.html")),
);
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ error: "preview_request_failed" });
});
const args = process.argv.slice(2),
  portIndex = args.indexOf("--port"),
  hostIndex = args.indexOf("--host");
app.listen(
  Number(portIndex >= 0 ? args[portIndex + 1] : process.env.PORT || 3400),
  hostIndex >= 0 ? args[hostIndex + 1] : "127.0.0.1",
  () =>
    console.log("Notebook demonstration ready; no real accounts or payments."),
);
