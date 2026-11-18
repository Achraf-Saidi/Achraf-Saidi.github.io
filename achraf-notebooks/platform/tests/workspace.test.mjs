import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { randomUUID } from "node:crypto";
import { testDatabase } from "./helpers/database.mjs";
import { mountWorkspaceRoutes } from "../src/workspace/routes.mjs";
import {
  DEFAULT_PROFILE,
  DEFAULT_OFFERS,
  GOALS,
  makeRoadmap,
  profileInput,
  validateLesson,
  reviewInterval,
  validateOffers,
  safeUrl,
} from "../src/workspace/model.mjs";

test("all goal roadmaps include ordered prerequisite closure, without equating study to mastery", () => {
  for (const goal of Object.keys(GOALS)) {
    const p = { ...DEFAULT_PROFILE, goal },
      road = makeRoadmap(p),
      seen = new Set();
    for (const m of road.modules) {
      for (const pre of m.prerequisites)
        assert.ok(seen.has(pre), `${goal}: ${pre} before ${m.id}`);
      seen.add(m.id);
    }
    assert.equal(road.modules.length, seen.size);
    assert.ok(road.totalHours >= road.modules.length);
    const studied = makeRoadmap(
      p,
      road.modules.map((m) => m.id),
    );
    assert.equal(studied.validated, 0);
    assert.equal(studied.remainingHours, 0);
    assert.equal(studied.next, null);
    assert.deepEqual(
      makeRoadmap({ ...p, level: "advanced" }).modules.map((m) => m.id),
      road.modules.map((m) => m.id),
    );
  }
});
test("invalid schedules, cyclic prerequisites, unsafe content and pricing are rejected", () => {
  assert.throws(() => profileInput({ ...DEFAULT_PROFILE, weeklyHours: 0 }));
  assert.throws(() => profileInput({ ...DEFAULT_PROFILE, days: [1, 1] }));
  const mods = { A: { prerequisites: ["B"] }, B: { prerequisites: ["A"] } };
  assert.throws(
    () =>
      makeRoadmap(DEFAULT_PROFILE, [], [], mods, [
        { id: "machine-learning", modules: ["A"] },
      ]),
    /cycle/,
  );
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("https://user:pass@example.com"), null);
  assert.throws(() =>
    validateLesson({
      moduleId: "A1",
      title: "Titre",
      status: "published",
      blocks: [{ type: "link", url: "data:text/html,test", text: "test" }],
    }),
  );
  assert.throws(() =>
    validateOffers(DEFAULT_OFFERS.map((p) => ({ ...p, monthly: NaN }))),
  );
  assert.equal(reviewInterval(5, "again"), 1);
  assert.equal(reviewInterval(5, "good"), 10);
  assert.throws(() => reviewInterval(1, "mastered"));
});
test("workspace integration: authorization, isolation, conflicts, publication, uploads, tutor, pricing and bank", async (t) => {
  const db = await testDatabase();
  t.after(() => db.close());
  for (const id of ["alice", "bob", "editor"])
    await db.query('INSERT INTO "user"(id,name,email) VALUES($1,$1,$2)', [
      id,
      id + "@example.test",
    ]);
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  const session = (req, res, next) => {
    const id = req.get("x-test-user");
    if (!["alice", "bob", "editor"].includes(id))
      return res.status(401).json({ error: "authentication_required" });
    req.currentUser = { id, name: id, email: id + "@example.test" };
    next();
  };
  const sameOrigin = (req, res, next) =>
    req.get("origin") === "https://notebook.test"
      ? next()
      : res.status(403).json({ error: "invalid_origin" });
  mountWorkspaceRoutes(app, {
    db,
    session,
    assertSameOrigin: sameOrigin,
    adminIds: "editor",
  });
  const server = app.listen(0, "127.0.0.1");
  t.after(() => server.close());
  await new Promise((r) => server.once("listening", r));
  const origin = "http://127.0.0.1:" + server.address().port;
  const request = async (
    path,
    {
      user = "alice",
      data,
      method,
      originHeader = "https://notebook.test",
      raw,
      mime,
    } = {},
  ) => {
    const r = await fetch(origin + path, {
      method: method || (data === undefined && !raw ? "GET" : "POST"),
      headers: {
        "x-test-user": user,
        origin: originHeader,
        ...(data !== undefined ? { "content-type": "application/json" } : {}),
        ...(raw ? { "content-type": mime } : {}),
      },
      body: raw || (data === undefined ? undefined : JSON.stringify(data)),
    });
    const body = await r.text();
    return {
      status: r.status,
      body: body.startsWith("{") ? JSON.parse(body) : body,
    };
  };
  const get = (path, user) => request(path, { user });
  assert.equal((await get("/api/workspace/me", "")).status, 401);
  assert.equal((await get("/api/admin/overview", "alice")).status, 403);
  assert.equal(
    (
      await request("/api/workspace/profile", {
        data: { profile: DEFAULT_PROFILE, revision: 0 },
        originHeader: "https://evil.test",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/api/workspace/profile", {
        data: { profile: DEFAULT_PROFILE, revision: 0 },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/api/workspace/profile", {
        data: { profile: DEFAULT_PROFILE, revision: 0 },
      })
    ).status,
    409,
  );
  let alice = (await get("/api/workspace/me")).body;
  assert.equal(alice.profileRevision, 1);
  assert.equal(alice.isAdmin, false);
  assert.equal(
    (
      await request("/api/workspace/notes/A1", {
        method: "PUT",
        data: { body: "Alice private note", revision: 0, userId: "bob" },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/api/workspace/notes/A1", {
        method: "PUT",
        data: { body: "stale", revision: 0 },
      })
    ).status,
    409,
  );
  assert.equal((await get("/api/workspace/me", "bob")).body.notes.length, 0);
  assert.equal(
    (await get("/api/workspace/me")).body.notes[0].body,
    "Alice private note",
  );
  const sid = randomUUID();
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await request("/api/workspace/sessions", {
          data: { id: sid, moduleId: "A1", minutes: 25 },
        })
      ).status,
      200,
    );
  assert.equal((await get("/api/workspace/me")).body.sessions.length, 1);
  assert.equal(
    (await request("/api/workspace/reviews/A1/add", { data: {} })).status,
    200,
  );
  assert.equal(
    (await request("/api/workspace/reviews/A1", { data: { quality: "good" } }))
      .body.interval_days,
    3,
  );
  const id = randomUUID(),
    lesson = {
      moduleId: "A1",
      title: "Leçon de nombres",
      status: "draft",
      revision: 0,
      blocks: [
        { type: "heading", text: "Les entiers" },
        {
          type: "text",
          text: "Les entiers permettent de compter des objets, sans partie fractionnaire.",
        },
      ],
    };
  assert.equal(
    (
      await request("/api/admin/lessons/" + id, {
        user: "alice",
        method: "PUT",
        data: lesson,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/api/admin/lessons/" + id, {
        user: "editor",
        method: "PUT",
        data: lesson,
      })
    ).status,
    200,
  );
  assert.equal((await get("/api/workspace/lessons")).body.lessons.length, 0);
  assert.equal(
    (
      await request("/api/workspace/tutor", {
        data: { question: "Les entiers ?", moduleId: "A1" },
      })
    ).body.sources.length,
    0,
  );
  assert.equal(
    (
      await request("/api/admin/lessons/" + id, {
        user: "editor",
        method: "PUT",
        data: { ...lesson, status: "published", revision: 1 },
      })
    ).status,
    200,
  );
  assert.equal((await get("/api/workspace/lessons")).body.lessons.length, 1);
  const tutor = (
    await request("/api/workspace/tutor", {
      data: { question: "Les entiers ?", moduleId: "A1" },
    })
  ).body;
  assert.equal(tutor.mode, "sources");
  assert.equal(tutor.sources[0].revision, 2);
  assert.ok(!JSON.stringify(tutor).includes("secret_answer"));
  assert.equal(
    (
      await request("/api/admin/lessons/" + id, {
        user: "editor",
        method: "PUT",
        data: { ...lesson, revision: 1 },
      })
    ).status,
    409,
  );
  assert.equal(
    (await get("/api/admin/lessons/" + id + "/history", "editor")).body.history
      .length,
    2,
  );
  assert.equal(
    (
      await request("/api/admin/assets", {
        user: "editor",
        raw: Buffer.from("<script>bad</script>"),
        mime: "image/png",
      })
    ).status,
    400,
  );
  const asset = await request("/api/admin/assets", {
    user: "editor",
    raw: Buffer.from("%PDF-1.7\nexample"),
    mime: "application/pdf",
  });
  assert.equal(asset.status, 201);
  assert.equal(
    (await get("/api/workspace/assets/" + asset.body.id, "alice")).status,
    404,
  );
  const assetBlock = {
    type: "asset",
    assetId: asset.body.id,
    text: "Document pédagogique",
  };
  assert.equal(
    (
      await request("/api/admin/lessons/" + id, {
        user: "editor",
        method: "PUT",
        data: {
          ...lesson,
          status: "published",
          revision: 2,
          blocks: [...lesson.blocks, assetBlock],
        },
      })
    ).status,
    200,
  );
  assert.equal(
    (await get("/api/workspace/assets/" + asset.body.id, "alice")).status,
    200,
  );
  const tid = randomUUID();
  assert.equal(
    (
      await request("/api/admin/trainings/" + tid, {
        user: "editor",
        method: "PUT",
        data: {
          title: "Les bases",
          description: "Parcours progressif des bases",
          type: "path",
          status: "published",
          moduleIds: ["A1", "A2"],
          revision: 0,
        },
      })
    ).status,
    200,
  );
  assert.equal(
    (await get("/api/workspace/trainings")).body.trainings.length,
    1,
  );
  assert.equal(
    (
      await request("/api/admin/offers", {
        user: "editor",
        method: "PUT",
        data: { offers: DEFAULT_OFFERS, revision: 0 },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/api/admin/offers", {
        user: "editor",
        method: "PUT",
        data: { offers: DEFAULT_OFFERS, revision: 0 },
      })
    ).status,
    409,
  );
  assert.equal(
    (await get("/api/workspace/offers")).body.paymentsEnabled,
    false,
  );
  const question = {
    id: "D3.integration",
    module_id: "D3",
    kind: "number",
    prompt_fr: "Une question numérique suffisamment longue pour le test.",
    prompt_en: "A numeric question with sufficient length for this test.",
    secret_answer: { value: 0.5, absoluteTolerance: 0.01 },
    explanation_fr:
      "Une explication suffisamment détaillée pour justifier le résultat.",
    explanation_en:
      "An explanation with sufficient detail to justify the expected result.",
    difficulty: 3,
    approved: false,
    revision: 0,
  };
  assert.equal(
    (
      await request("/api/admin/questions/" + question.id, {
        user: "editor",
        method: "PUT",
        data: question,
      })
    ).status,
    200,
  );
  assert.equal((await get("/api/admin/questions/D3", "bob")).status, 403);
  assert.equal(
    (await get("/api/admin/questions/D3", "editor")).body.questions[0].approved,
    false,
  );
  assert.equal(
    (await get("/api/admin/learners", "editor")).body.learners[0].name,
    "alice",
  );
  const overview = (await get("/api/admin/overview", "editor")).body;
  assert.ok(overview.audits.length >= 4);
});
