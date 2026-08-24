#!/usr/bin/env node
// 一条命令同时起 main + apps 两个进程。Ctrl+C 全部关掉。

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const MAIN_PORT = process.env.AIOS_MAIN_PORT || process.env.AIOS_SERVER_PORT || "9502";
const APPS_PORT = process.env.AIOS_APPS_PORT || "9503";

const procs = [];

const start = (name, args, env = {}) => {
  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ["inherit", "inherit", "inherit"]
  });
  child.on("exit", (code, signal) => {
    if (!shuttingDown) {
      process.stderr.write(`\n[${name}] exited (code=${code}, signal=${signal})\n`);
    }
    shutdown(1);
  });
  procs.push(child);
  return child;
};

let shuttingDown = false;
const shutdown = (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const p of procs) {
    try { p.kill("SIGINT"); } catch {}
  }
  setTimeout(() => process.exit(code), 200);
};

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start("main", [join(ROOT, "server/main/index.js"), `--port=${MAIN_PORT}`], {
  AIOS_MAIN_PORT: MAIN_PORT,
  AIOS_APPS_PORT: APPS_PORT
});
start("apps", [join(ROOT, "server/apps/index.js"), `--port=${APPS_PORT}`], {
  AIOS_MAIN_PORT: MAIN_PORT,
  AIOS_APPS_PORT: APPS_PORT
});
