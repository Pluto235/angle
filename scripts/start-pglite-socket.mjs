import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import path from "node:path";

const rootDir = path.resolve(new URL(".", import.meta.url).pathname, "..");
const dbPath = process.env.PGLITE_DATA_DIR || path.join(rootDir, ".pglite-data");
const host = process.env.PGLITE_HOST || "127.0.0.1";
const port = Number.parseInt(process.env.PGLITE_PORT || "55432", 10);

const db = await PGlite.create({
  dataDir: dbPath,
  database: "postgres",
});

const server = new PGLiteSocketServer({
  db,
  host,
  port,
});

await server.start();
console.log(`PGLiteSocketServer listening on ${host}:${port}`);

const shutdown = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

setInterval(() => {}, 1 << 30);
