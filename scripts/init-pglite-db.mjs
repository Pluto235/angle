import { execFileSync } from "node:child_process";
import path from "node:path";

import pg from "pg";

const rootDir = path.resolve(new URL(".", import.meta.url).pathname, "..");
const schemaPath = path.join(rootDir, "prisma", "schema.prisma");
const prismaBin = path.join(rootDir, "node_modules", ".bin", "prisma");
const host = process.env.PGLITE_HOST || "127.0.0.1";
const port = Number.parseInt(process.env.PGLITE_PORT || "55432", 10);
const databaseUrl = process.env.DATABASE_URL || `postgresql://postgres:postgres@${host}:${port}/postgres`;

function splitSqlStatements(sql) {
  const statements = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const nextChar = sql[index + 1];

    if (inLineComment) {
      current += char;

      if (char === "\n") {
        inLineComment = false;
      }

      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && char === "-" && nextChar === "-") {
      inLineComment = true;
      current += char;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      const escaped = sql[index - 1] === "\\";

      if (!escaped) {
        inSingleQuote = !inSingleQuote;
      }

      current += char;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }

    if (char === ";" && !inSingleQuote && !inDoubleQuote) {
      const statement = current.trim();

      if (statement) {
        statements.push(statement);
      }

      current = "";
      continue;
    }

    current += char;
  }

  const trailingStatement = current.trim();

  if (trailingStatement) {
    statements.push(trailingStatement);
  }

  return statements;
}

const client = new pg.Client({
  connectionString: databaseUrl,
});

try {
  await client.connect();

  const existing = await client.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'User'
    ) AS "exists"
  `);

  if (!existing.rows[0]?.exists) {
    const sql = execFileSync(
      prismaBin,
      ["migrate", "diff", "--from-empty", "--to-schema", schemaPath, "--script"],
      {
        cwd: rootDir,
        env: process.env,
        encoding: "utf8",
      },
    );

    const statements = splitSqlStatements(sql);

    for (const statement of statements) {
      await client.query(statement);
    }
  }

  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'ParticipantGender'
      ) THEN
        CREATE TYPE "ParticipantGender" AS ENUM ('MALE', 'FEMALE');
      END IF;
    END $$;
  `);

  await client.query(`
    ALTER TABLE "Pool"
    ADD COLUMN IF NOT EXISTS "spicyModeEnabled" BOOLEAN NOT NULL DEFAULT false;
  `);

  await client.query(`
    ALTER TABLE "Pool"
    ADD COLUMN IF NOT EXISTS "boomerangModeEnabled" BOOLEAN NOT NULL DEFAULT false;
  `);

  await client.query(`
    ALTER TABLE "Pool"
    ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
  `);

  await client.query(`
    ALTER TABLE "Participant"
    ADD COLUMN IF NOT EXISTS "gender" "ParticipantGender";
  `);
} finally {
  await client.end().catch(() => {});
}
