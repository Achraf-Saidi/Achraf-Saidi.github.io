import express from "express";
import { randomUUID } from "node:crypto";
import {
  DEFAULT_PROFILE,
  DEFAULT_OFFERS,
  GOALS,
  profileInput,
  makeRoadmap,
  validateLesson,
  validateOffers,
  validateTraining,
  reviewInterval,
  detectAsset,
} from "./model.mjs";
import { MODULE_INDEX } from "../learning/module-index.mjs";
import { isUuid, verifyQuestion } from "../learning/assessment.mjs";
import { PILOT_SEQUENCE } from "../learning/catalog.mjs";

export function mountWorkspaceRoutes(
  app,
  {
    db,
    session,
    assertSameOrigin,
    adminIds = process.env.NOTEBOOK_ADMIN_IDS || "",
  },
) {
  const admins = new Set(
    adminIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const isAdmin = (req) => admins.has(req.currentUser?.id);
  const admin = (req, res, next) =>
    isAdmin(req) ? next() : res.status(403).json({ error: "admin_required" });
  const wrap = (fn) => async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      const input = /^(invalid_|unknown_|missing_|prerequisite_)/.test(
        e.message,
      );
      res
        .status(input ? 400 : 503)
        .json({ error: input ? e.message : "workspace_unavailable" });
    }
  };
  const mutate = [assertSameOrigin, session];
  const audit = async (c, req, action, target, detail = {}) =>
    c.query(
      "INSERT INTO notebook_audit(id,actor_id,action,target_id,detail) VALUES($1,$2,$3,$4,$5)",
      [
        randomUUID(),
        req.currentUser.id,
        action,
        target,
        JSON.stringify(detail),
      ],
    );
  const transaction = async (fn) => {
    const c = await db.connect();
    try {
      await c.query("BEGIN");
      const result = await fn(c);
      await c.query("COMMIT");
      return result;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  };
  const moduleCheck = (id) => {
    if (!MODULE_INDEX[id]) throw Error("unknown_module");
  };
  const revisionCheck = (n) => {
    if (!Number.isInteger(n) || n < 0) throw Error("invalid_revision");
  };
  const conflict = (res) =>
    res.status(409).json({ error: "revision_conflict" });
  app.get("/api/workspace/config", (_req, res) =>
    res.json({
      mode: "server",
      goals: GOALS,
      tutor: { enabled: false, mode: "sources" },
      billingEnabled: false,
    }),
  );
  app.get(
    "/api/workspace/offers",
    wrap(async (_req, res) => {
      const r = await db.query(
        "SELECT value,revision FROM notebook_settings WHERE key='offers'",
      );
      res.json({
        offers: r.rows[0]?.value || DEFAULT_OFFERS,
        revision: r.rows[0]?.revision || 0,
        provisional: true,
        paymentsEnabled: false,
      });
    }),
  );
  app.get(
    "/api/workspace/me",
    session,
    wrap(async (req, res) => {
      const uid = req.currentUser.id;
      const [profile, notes, reviews, sessions, learning, passes, attempts] =
        await Promise.all([
          db.query(
            "SELECT preferences,revision FROM learner_profiles WHERE user_id=$1",
            [uid],
          ),
          db.query(
            "SELECT module_id,body,revision,updated_at FROM learner_notes WHERE user_id=$1 ORDER BY updated_at DESC",
            [uid],
          ),
          db.query(
            "SELECT module_id,due_at,interval_days,repetitions FROM learning_reviews WHERE user_id=$1 ORDER BY due_at",
            [uid],
          ),
          db.query(
            "SELECT id,module_id,minutes,studied_at FROM learning_sessions WHERE user_id=$1 ORDER BY studied_at DESC LIMIT 200",
            [uid],
          ),
          db.query(
            "SELECT module_id,self_reported_completed,updated_at FROM learning_events WHERE user_id=$1",
            [uid],
          ),
          db.query(
            "SELECT exam_id,best_score,passed_at FROM assessment_passes WHERE user_id=$1",
            [uid],
          ),
          db.query(
            "SELECT id,exam_id,state,score,started_at,expires_at FROM assessment_attempts WHERE user_id=$1 ORDER BY started_at DESC LIMIT 100",
            [uid],
          ),
        ]);
      const p = profile.rows[0]?.preferences || DEFAULT_PROFILE;
      res.json({
        user: { name: req.currentUser.name, email: req.currentUser.email },
        isAdmin: isAdmin(req),
        profile: p,
        profileRevision: profile.rows[0]?.revision || 0,
        notes: notes.rows,
        reviews: reviews.rows,
        sessions: sessions.rows,
        learning: learning.rows,
        passes: passes.rows,
        attempts: attempts.rows,
        roadmap: makeRoadmap(
          p,
          learning.rows
            .filter((x) => x.self_reported_completed)
            .map((x) => x.module_id),
          passes.rows.map((x) => x.exam_id),
        ),
      });
    }),
  );
  app.post(
    "/api/workspace/profile",
    ...mutate,
    wrap(async (req, res) => {
      const p = profileInput(req.body?.profile),
        v = req.body?.revision;
      revisionCheck(v);
      const r = await db.query(
        `INSERT INTO learner_profiles(user_id,preferences) SELECT $1,$2 WHERE $3=0
   ON CONFLICT(user_id) DO NOTHING RETURNING revision`,
        [req.currentUser.id, JSON.stringify(p), v],
      );
      if (r.rowCount) return res.json({ revision: r.rows[0].revision });
      const u = await db.query(
        "UPDATE learner_profiles SET preferences=$2,revision=revision+1,updated_at=now() WHERE user_id=$1 AND revision=$3 RETURNING revision",
        [req.currentUser.id, JSON.stringify(p), v],
      );
      if (!u.rowCount) return conflict(res);
      res.json(u.rows[0]);
    }),
  );
  app.post(
    "/api/workspace/roadmap",
    ...mutate,
    wrap(async (req, res) => {
      const p = profileInput(req.body?.profile);
      const r = await db.query(
        "SELECT module_id FROM learning_events WHERE user_id=$1 AND self_reported_completed=TRUE",
        [req.currentUser.id],
      );
      const v = await db.query(
        "SELECT exam_id FROM assessment_passes WHERE user_id=$1",
        [req.currentUser.id],
      );
      res.json(
        makeRoadmap(
          p,
          r.rows.map((x) => x.module_id),
          v.rows.map((x) => x.exam_id),
        ),
      );
    }),
  );
  app.put(
    "/api/workspace/notes/:id",
    ...mutate,
    wrap(async (req, res) => {
      moduleCheck(req.params.id);
      const { body, revision } = req.body || {};
      revisionCheck(revision);
      if (typeof body !== "string" || body.length > 12000)
        throw Error("invalid_note");
      const r = await db.query(
        "INSERT INTO learner_notes(user_id,module_id,body) SELECT $1,$2,$3 WHERE $4=0 ON CONFLICT DO NOTHING RETURNING revision",
        [req.currentUser.id, req.params.id, body, revision],
      );
      if (r.rowCount) return res.json(r.rows[0]);
      const u = await db.query(
        "UPDATE learner_notes SET body=$3,revision=revision+1,updated_at=now() WHERE user_id=$1 AND module_id=$2 AND revision=$4 RETURNING revision",
        [req.currentUser.id, req.params.id, body, revision],
      );
      if (!u.rowCount) return conflict(res);
      res.json(u.rows[0]);
    }),
  );
  app.post(
    "/api/workspace/sessions",
    ...mutate,
    wrap(async (req, res) => {
      const { id, moduleId, minutes } = req.body || {};
      moduleCheck(moduleId);
      if (
        !isUuid(id) ||
        !Number.isInteger(minutes) ||
        minutes < 1 ||
        minutes > 240
      )
        throw Error("invalid_session");
      await db.query(
        "INSERT INTO learning_sessions(id,user_id,module_id,minutes) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING",
        [id, req.currentUser.id, moduleId, minutes],
      );
      res.json({
        saved: true,
        notice: "Temps déclaré, sans validation de compétence.",
      });
    }),
  );
  app.post(
    "/api/workspace/reviews/:id",
    ...mutate,
    wrap(async (req, res) => {
      moduleCheck(req.params.id);
      const quality = req.body?.quality;
      reviewInterval(1, quality);
      const value = await transaction(async (c) => {
        await c.query(
          "INSERT INTO learning_reviews(user_id,module_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [req.currentUser.id, req.params.id],
        );
        const r = await c.query(
          "SELECT interval_days FROM learning_reviews WHERE user_id=$1 AND module_id=$2 FOR UPDATE",
          [req.currentUser.id, req.params.id],
        );
        const days = reviewInterval(r.rows[0].interval_days, quality);
        const result = await c.query(
          "UPDATE learning_reviews SET due_at=now()+($3 * interval '1 day'),interval_days=$3,repetitions=repetitions+1 WHERE user_id=$1 AND module_id=$2 RETURNING *",
          [req.currentUser.id, req.params.id, days],
        );
        return result.rows[0];
      });
      res.json(value);
    }),
  );
  app.post(
    "/api/workspace/reviews/:id/add",
    ...mutate,
    wrap(async (req, res) => {
      moduleCheck(req.params.id);
      await db.query(
        "INSERT INTO learning_reviews(user_id,module_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [req.currentUser.id, req.params.id],
      );
      res.json({ saved: true });
    }),
  );
  app.get(
    "/api/workspace/lessons",
    session,
    wrap(async (req, res) => {
      const moduleId = req.query.module;
      if (moduleId) moduleCheck(moduleId);
      const r = moduleId
        ? await db.query(
            "SELECT id,module_id,title,blocks,revision,updated_at FROM notebook_lessons WHERE status='published' AND module_id=$1 ORDER BY title",
            [moduleId],
          )
        : await db.query(
            "SELECT id,module_id,title,revision,updated_at FROM notebook_lessons WHERE status='published' ORDER BY module_id,title",
          );
      res.json({ lessons: r.rows });
    }),
  );
  app.get(
    "/api/workspace/trainings",
    session,
    wrap(async (_req, res) => {
      const r = await db.query(
        "SELECT id,definition,revision FROM notebook_trainings WHERE definition->>'status'='published'",
      );
      res.json({ trainings: r.rows });
    }),
  );
  app.get(
    "/api/workspace/assets/:id",
    session,
    wrap(async (req, res) => {
      if (!isUuid(req.params.id)) throw Error("invalid_asset");
      if (!isAdmin(req)) {
        const links = await db.query(
          "SELECT 1 FROM notebook_lessons WHERE status='published' AND blocks @> $1::jsonb LIMIT 1",
          [JSON.stringify([{ type: "asset", assetId: req.params.id }])],
        );
        if (!links.rowCount)
          return res.status(404).json({ error: "asset_not_found" });
      }
      const r = await db.query(
        "SELECT filename,mime,bytes FROM notebook_assets WHERE id=$1",
        [req.params.id],
      );
      if (!r.rowCount)
        return res.status(404).json({ error: "asset_not_found" });
      const a = r.rows[0];
      res
        .type(a.mime)
        .set(
          "Content-Disposition",
          `${req.query.inline === "1" && a.mime.startsWith("image/") ? "inline" : "attachment"}; filename="${a.filename}"`,
        )
        .send(a.bytes);
    }),
  );
  app.post(
    "/api/workspace/tutor",
    ...mutate,
    wrap(async (req, res) => {
      const { question, moduleId } = req.body || {};
      moduleCheck(moduleId);
      if (
        typeof question !== "string" ||
        question.length < 3 ||
        question.length > 1500
      )
        throw Error("invalid_question");
      // No external model call, credential, or invented answer. This endpoint prepares
      // an authorized, published-only context for a future server-side tutor adapter.
      const r = await db.query(
        "SELECT id,title,blocks,revision FROM notebook_lessons WHERE module_id=$1 AND status='published' ORDER BY updated_at DESC LIMIT 8",
        [moduleId],
      );
      const terms =
        question.toLocaleLowerCase("fr").match(/[\p{L}\p{N}]{3,}/gu) || [];
      const sources = r.rows
        .map((l) => ({
          id: l.id,
          title: l.title,
          revision: l.revision,
          excerpt: l.blocks
            .filter((b) => ["text", "callout"].includes(b.type))
            .map((b) => b.text)
            .join("\n")
            .slice(0, 3000),
        }))
        .map((s) => ({
          ...s,
          rank: terms.reduce(
            (n, t) => n + Number(s.excerpt.toLocaleLowerCase("fr").includes(t)),
            0,
          ),
        }))
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 3);
      res.json({
        mode: "sources",
        answer:
          "Le tuteur génératif n’est pas encore activé. Voici les ressources publiées de ce module ; aucune réponse IA n’a été générée.",
        sources,
        publicCourse: `https://achraf-saidi.github.io/achraf-notebooks/academy/fr/?id=${moduleId}`,
      });
    }),
  );
  app.get(
    "/api/admin/overview",
    session,
    admin,
    wrap(async (_req, res) => {
      const [lessons, trainings, offers, counts, questions, audits] =
        await Promise.all([
          db.query(
            "SELECT id,module_id,title,status,revision,updated_at FROM notebook_lessons ORDER BY updated_at DESC",
          ),
          db.query(
            "SELECT id,definition,revision FROM notebook_trainings ORDER BY updated_at DESC",
          ),
          db.query(
            "SELECT value,revision FROM notebook_settings WHERE key='offers'",
          ),
          db.query(
            "SELECT count(*)::integer AS learners FROM learner_profiles",
          ),
          db.query(
            "SELECT module_id,count(*)::integer AS total,count(*) FILTER(WHERE approved AND active)::integer AS approved FROM assessment_questions GROUP BY module_id",
          ),
          db.query(
            "SELECT action,target_id,created_at FROM notebook_audit ORDER BY created_at DESC LIMIT 20",
          ),
        ]);
      res.json({
        lessons: lessons.rows,
        trainings: trainings.rows,
        offers: offers.rows[0]?.value || DEFAULT_OFFERS,
        offersRevision: offers.rows[0]?.revision || 0,
        learners: counts.rows[0]?.learners || 0,
        questions: questions.rows,
        audits: audits.rows,
      });
    }),
  );
  app.put(
    "/api/admin/lessons/:id",
    ...mutate,
    admin,
    wrap(async (req, res) => {
      const id = req.params.id;
      if (!isUuid(id)) throw Error("invalid_lesson_id");
      const value = validateLesson(req.body),
        v = req.body.revision;
      revisionCheck(v);
      const result = await transaction(async (c) => {
        for (const b of value.blocks.filter((b) => b.type === "asset")) {
          const a = await c.query(
            "SELECT id,mime FROM notebook_assets WHERE id=$1",
            [b.assetId],
          );
          if (!a.rowCount) throw Error("invalid_asset");
          b.mime = a.rows[0].mime;
        }
        let r;
        if (v === 0)
          r = await c.query(
            "INSERT INTO notebook_lessons(id,module_id,title,status,blocks,updated_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING revision",
            [
              id,
              value.moduleId,
              value.title,
              value.status,
              JSON.stringify(value.blocks),
              req.currentUser.id,
            ],
          );
        else
          r = await c.query(
            "UPDATE notebook_lessons SET module_id=$2,title=$3,status=$4,blocks=$5,updated_by=$6,revision=revision+1,updated_at=now() WHERE id=$1 AND revision=$7 RETURNING revision",
            [
              id,
              value.moduleId,
              value.title,
              value.status,
              JSON.stringify(value.blocks),
              req.currentUser.id,
              v,
            ],
          );
        if (!r.rowCount) return null;
        const revision = r.rows[0].revision;
        await c.query(
          "INSERT INTO notebook_revisions(lesson_id,revision,snapshot) VALUES($1,$2,$3)",
          [id, revision, JSON.stringify(value)],
        );
        await audit(c, req, "lesson." + value.status, id, { revision });
        return { id, revision };
      });
      if (!result) return conflict(res);
      res.json(result);
    }),
  );
  app.get(
    "/api/admin/lessons/:id",
    session,
    admin,
    wrap(async (req, res) => {
      if (!isUuid(req.params.id)) throw Error("invalid_lesson_id");
      const r = await db.query(
        "SELECT id,module_id,title,status,blocks,revision,updated_at FROM notebook_lessons WHERE id=$1",
        [req.params.id],
      );
      if (!r.rowCount)
        return res.status(404).json({ error: "lesson_not_found" });
      res.json(r.rows[0]);
    }),
  );
  app.get(
    "/api/admin/lessons/:id/history",
    session,
    admin,
    wrap(async (req, res) => {
      if (!isUuid(req.params.id)) throw Error("invalid_lesson_id");
      const r = await db.query(
        "SELECT revision,snapshot,created_at FROM notebook_revisions WHERE lesson_id=$1 ORDER BY revision DESC LIMIT 30",
        [req.params.id],
      );
      res.json({ history: r.rows });
    }),
  );
  app.post(
    "/api/admin/assets",
    ...mutate,
    admin,
    express.raw({
      type: ["application/pdf", "image/png", "image/jpeg"],
      limit: "8mb",
    }),
    wrap(async (req, res) => {
      if (
        !Buffer.isBuffer(req.body) ||
        !req.body.length ||
        req.body.length > 8388608
      )
        throw Error("invalid_asset");
      const kind = detectAsset(req.body);
      if (!kind) throw Error("invalid_asset_type");
      const id = randomUUID(),
        filename = `resource-${id.slice(0, 8)}.${kind.extension}`;
      await transaction(async (c) => {
        await c.query(
          "INSERT INTO notebook_assets(id,filename,mime,bytes,created_by) VALUES($1,$2,$3,$4,$5)",
          [id, filename, kind.mime, req.body, req.currentUser.id],
        );
        await audit(c, req, "asset.upload", id);
      });
      res.status(201).json({ id, filename, mime: kind.mime });
    }),
  );
  app.put(
    "/api/admin/trainings/:id",
    ...mutate,
    admin,
    wrap(async (req, res) => {
      if (!isUuid(req.params.id)) throw Error("invalid_training_id");
      const value = validateTraining(req.body),
        v = req.body.revision;
      revisionCheck(v);
      const r = await transaction(async (c) => {
        const q =
          v === 0
            ? await c.query(
                "INSERT INTO notebook_trainings(id,definition) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING revision",
                [req.params.id, JSON.stringify(value)],
              )
            : await c.query(
                "UPDATE notebook_trainings SET definition=$2,revision=revision+1,updated_at=now() WHERE id=$1 AND revision=$3 RETURNING revision",
                [req.params.id, JSON.stringify(value), v],
              );
        if (q.rowCount) await audit(c, req, "training.save", req.params.id);
        return q;
      });
      if (!r.rowCount) return conflict(res);
      res.json(r.rows[0]);
    }),
  );
  app.put(
    "/api/admin/offers",
    ...mutate,
    admin,
    wrap(async (req, res) => {
      const offers = validateOffers(req.body?.offers),
        v = req.body?.revision;
      revisionCheck(v);
      const r = await transaction(async (c) => {
        const q =
          v === 0
            ? await c.query(
                "INSERT INTO notebook_settings(key,value) VALUES('offers',$1) ON CONFLICT DO NOTHING RETURNING revision",
                [JSON.stringify(offers)],
              )
            : await c.query(
                "UPDATE notebook_settings SET value=$1,revision=revision+1 WHERE key='offers' AND revision=$2 RETURNING revision",
                [JSON.stringify(offers), v],
              );
        if (q.rowCount)
          await audit(c, req, "offers.proposal", "offers", { offers });
        return q;
      });
      if (!r.rowCount) return conflict(res);
      res.json({ ...r.rows[0], paymentsEnabled: false });
    }),
  );
  app.get(
    "/api/admin/learners",
    session,
    admin,
    wrap(async (req, res) => {
      const page = Math.max(
        0,
        Math.min(10000, Number.parseInt(req.query.page) || 0),
      );
      const r = await db.query(
        `SELECT u.id,u.name,u.email,p.preferences,p.updated_at,
   (SELECT count(*)::integer FROM assessment_passes ap WHERE ap.user_id=u.id) AS passed,
   (SELECT count(*)::integer FROM learning_events e WHERE e.user_id=u.id AND e.self_reported_completed) AS studied
   FROM learner_profiles p JOIN "user" u ON u.id=p.user_id ORDER BY p.updated_at DESC LIMIT 25 OFFSET $1`,
        [page * 25],
      );
      res.json({ learners: r.rows, page });
    }),
  );
  app.put(
    "/api/admin/questions/:id",
    ...mutate,
    admin,
    wrap(async (req, res) => {
      const q = req.body;
      if (
        !q ||
        q.id !== req.params.id ||
        !verifyQuestion(q) ||
        !PILOT_SEQUENCE.includes(q.module_id) ||
        !q.id.startsWith(q.module_id + ".") ||
        q.id.length > 100 ||
        !Number.isFinite(q.secret_answer.value) ||
        !Number.isFinite(q.secret_answer.absoluteTolerance ?? 0) ||
        typeof q.explanation_fr !== "string" ||
        q.explanation_fr.length < 40 ||
        typeof q.explanation_en !== "string" ||
        q.explanation_en.length < 40 ||
        typeof q.approved !== "boolean"
      )
        throw Error("invalid_question");
      revisionCheck(q.revision);
      const r = await transaction(async (c) => {
        const values = [
          q.id,
          q.module_id,
          q.kind,
          q.prompt_fr,
          q.prompt_en,
          JSON.stringify(q.options_fr || null),
          JSON.stringify(q.options_en || null),
          JSON.stringify(q.secret_answer),
          q.explanation_fr,
          q.explanation_en,
          q.difficulty,
          q.approved,
          req.currentUser.id,
        ];
        const result =
          q.revision === 0
            ? await c.query(
                `INSERT INTO assessment_questions(id,module_id,kind,prompt_fr,prompt_en,options_fr,options_en,secret_answer,explanation_fr,explanation_en,difficulty,approved,active,reviewer_id,reviewed_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12,$13,now()) ON CONFLICT(id) DO NOTHING RETURNING content_version`,
                values,
              )
            : await c.query(
                `UPDATE assessment_questions SET module_id=$2,kind=$3,prompt_fr=$4,prompt_en=$5,options_fr=$6,options_en=$7,secret_answer=$8,explanation_fr=$9,explanation_en=$10,difficulty=$11,approved=$12,active=$12,reviewer_id=$13,reviewed_at=now(),content_version=content_version+1 WHERE id=$1 AND content_version=$14 RETURNING content_version`,
                [...values, q.revision],
              );
        if (!result.rowCount) return null;
        await audit(c, req, "question.save", q.id, { approved: q.approved });
        return result.rows[0];
      });
      if (!r) return conflict(res);
      res.json(r);
    }),
  );
  app.get(
    "/api/admin/questions/:module",
    session,
    admin,
    wrap(async (req, res) => {
      if (!PILOT_SEQUENCE.includes(req.params.module))
        throw Error("unknown_module");
      const r = await db.query(
        "SELECT * FROM assessment_questions WHERE module_id=$1 ORDER BY id",
        [req.params.module],
      );
      res.json({ questions: r.rows });
    }),
  );
}
