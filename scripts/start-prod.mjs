import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDir = path.join(rootDir, ".next", "standalone");
const standaloneServerPath = path.join(standaloneDir, "server.js");
const prismaBin = path.join(rootDir, "node_modules", ".bin", "prisma");
const nextBin = path.join(rootDir, "node_modules", ".bin", "next");
const initPgliteScriptPath = path.join(rootDir, "scripts", "init-pglite-db.mjs");
const startPgliteScriptPath = path.join(rootDir, "scripts", "start-pglite-socket.mjs");

let pgliteProcess = null;
let appProcess = null;
let embeddedDbStarted = false;
let shuttingDown = false;

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${path.basename(command)} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function waitForPort(host, port, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const socket = net.connect({ host, port });

        socket.once("connect", () => {
          socket.end();
          resolve();
        });

        socket.once("error", reject);
      });

      return;
    } catch {
      await wait(250);
    }
  }

  throw new Error(`Timed out waiting for ${host}:${port}`);
}

function syncStandaloneAssets() {
  if (!existsSync(standaloneServerPath)) {
    return;
  }

  const staticSourcePath = path.join(rootDir, ".next", "static");
  const staticTargetPath = path.join(standaloneDir, ".next", "static");
  const publicSourcePath = path.join(rootDir, "public");
  const publicTargetPath = path.join(standaloneDir, "public");

  if (existsSync(staticSourcePath)) {
    rmSync(staticTargetPath, { recursive: true, force: true });
    mkdirSync(path.dirname(staticTargetPath), { recursive: true });
    cpSync(staticSourcePath, staticTargetPath, { recursive: true });
  }

  if (existsSync(publicSourcePath)) {
    rmSync(publicTargetPath, { recursive: true, force: true });
    cpSync(publicSourcePath, publicTargetPath, { recursive: true });
  }
}

async function startEmbeddedDatabase() {
  const host = process.env.PGLITE_HOST || "127.0.0.1";
  const port = Number.parseInt(process.env.PGLITE_PORT || "55432", 10);
  const dataDir = process.env.PGLITE_DATA_DIR || path.join(rootDir, ".pglite-data");

  process.env.PGLITE_HOST = host;
  process.env.PGLITE_PORT = String(port);
  process.env.PGLITE_DATA_DIR = dataDir;
  process.env.DATABASE_URL = `postgresql://postgres:postgres@${host}:${port}/postgres`;
  process.env.PG_POOL_MAX = process.env.PG_POOL_MAX || "5";

  console.log(`Starting embedded PGlite on ${host}:${port}`);

  pgliteProcess = spawn(process.execPath, [startPgliteScriptPath], {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
  });

  pgliteProcess.on("error", (error) => {
    console.error("Embedded PGlite failed to start", error);
    process.exit(1);
  });

  pgliteProcess.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      console.error(`Embedded PGlite exited unexpectedly with code ${code ?? "unknown"}`);
      process.exit(code ?? 1);
    }
  });

  await waitForPort(host, port);
  await run(process.execPath, [initPgliteScriptPath]);
  embeddedDbStarted = true;
}

async function prepareDatabase() {
  if (!process.env.DATABASE_URL) {
    await startEmbeddedDatabase();
    return;
  }

  console.log("Using external DATABASE_URL");

  if (process.env.RUN_DB_PUSH !== "false") {
    console.log("Applying Prisma schema with db push");
    await run(prismaBin, ["db", "push"]);
  }
}

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (appProcess && !appProcess.killed) {
    appProcess.kill("SIGTERM");
  }

  if (pgliteProcess && !pgliteProcess.killed) {
    pgliteProcess.kill("SIGTERM");
  }

  process.exit(code);
}

async function main() {
  process.env.NODE_ENV = process.env.NODE_ENV || "production";
  process.env.NEXT_TELEMETRY_DISABLED = process.env.NEXT_TELEMETRY_DISABLED || "1";
  process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
  process.env.PORT = process.env.PORT || "3000";

  await prepareDatabase();
  syncStandaloneAssets();

  const serverCommand = existsSync(standaloneServerPath) ? process.execPath : nextBin;
  const serverArgs = existsSync(standaloneServerPath) ? [standaloneServerPath] : ["start"];

  if (embeddedDbStarted) {
    console.log("Application booting with embedded PGlite");
  }

  appProcess = spawn(serverCommand, serverArgs, {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
  });

  appProcess.on("error", (error) => {
    console.error("Application failed to start", error);
    shutdown(1);
  });

  appProcess.on("exit", (code) => {
    shutdown(code ?? 0);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

main().catch((error) => {
  console.error(error);
  shutdown(1);
});
