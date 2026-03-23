import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { PGlite } from "@electric-sql/pglite";

const execFileAsync = promisify(execFile);

const rootDir = path.resolve(new URL(".", import.meta.url).pathname, "..");
const dbPath = process.env.PGLITE_DATA_DIR || path.join(rootDir, ".pglite-data");
const schemaPath = path.join(rootDir, "prisma", "schema.prisma");
const prismaBin = path.join(rootDir, "node_modules", ".bin", "prisma");
const sqlPath = path.join(rootDir, ".pglite-init.sql");

const db = await PGlite.create({
  dataDir: dbPath,
  database: "postgres",
});

try {
  const existing = await db.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'User'
    ) AS "exists"
  `);

  if (existing.rows[0]?.exists) {
    process.exit(0);
  }

  await execFileAsync(
    prismaBin,
    [
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema",
      schemaPath,
      "--script",
      "--output",
      sqlPath,
    ],
    {
      cwd: rootDir,
      env: process.env,
    },
  );

  const sql = await fs.readFile(sqlPath, "utf8");
  await db.exec(sql);
  await fs.unlink(sqlPath).catch(() => {});
} finally {
  await db.close();
}
