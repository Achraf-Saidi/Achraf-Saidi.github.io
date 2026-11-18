import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
export async function testDatabase() {
  const pg = new PGlite();
  await pg.exec(
    'CREATE TABLE "user" (id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL)',
  );
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../migrations",
  );
  for (const name of (await fs.readdir(root))
    .filter((n) => n.endsWith(".sql"))
    .sort())
    await pg.exec(await fs.readFile(path.join(root, name), "utf8"));
  const query = async (sql, args = []) => {
    const r = await pg.query(sql, args);
    return { ...r, rowCount: r.rows.length || r.affectedRows || 0 };
  };
  // Serializes transaction connections in this embedded test adapter.
  let tail = Promise.resolve();
  const db = {
    query,
    connect: async () => {
      let release;
      const prior = tail;
      tail = new Promise((r) => {
        release = r;
      });
      await prior;
      return { query, release };
    },
    close: () => pg.close(),
    exec: (sql) => pg.exec(sql),
  };
  return db;
}
