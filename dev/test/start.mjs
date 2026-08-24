#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const testRoot = path.dirname(__filename);
const sourceRoot = path.resolve(testRoot, "../..");
const runtimeRoot = path.join(testRoot, "aios");

const mainPort = process.env.AIOS_TEST_MAIN_PORT || "19502";
const appsPort = process.env.AIOS_TEST_APPS_PORT || "19503";
const uiPort = process.env.AIOS_TEST_UI_PORT || "15173";

const rawArgs = process.argv.slice(2);
const keepDb = rawArgs.includes("--keep-db");
const locale = rawArgs.find((arg) => !arg.startsWith("--")) || process.env.AIOS_LANG || "zh";

const rootExcluded = new Set([
  ".aios",
  ".claude",
  ".git",
  ".qwen",
  "aios-test",
  "apps",
  "database",
  "dev",
  "files",
  "node_modules",
  "skills",
]);

const nestedExcluded = new Set(["node_modules", ".DS_Store"]);
const runtimeStateDirs = new Set([".aios", "database", "files"]);

const shouldSkip = (src) => {
  const rel = path.relative(sourceRoot, src);
  if (!rel) return false;
  const parts = rel.split(path.sep);
  if (parts.length === 1 && rootExcluded.has(parts[0])) return true;
  if (parts.includes("node_modules")) return true;
  if (parts.includes(".git")) return true;
  if (nestedExcluded.has(parts.at(-1))) return true;
  if (rel === "ui/dist" || rel.startsWith(`ui${path.sep}dist${path.sep}`)) return true;
  return false;
};

const run = (label, command, args, options = {}) => {
  console.log(`[aios-test] ${label}`);
  const result = spawnSync(command, args, {
    cwd: runtimeRoot,
    env: { ...process.env, ...options.env },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
};

const prepareRuntime = () => {
  const rel = path.relative(sourceRoot, runtimeRoot);
  if (!keepDb) {
    console.log(`[aios-test] reset ${rel}`);
    fs.rmSync(runtimeRoot, { recursive: true, force: true });
    fs.mkdirSync(runtimeRoot, { recursive: true });
    return;
  }

  console.log(`[aios-test] sync ${rel} (--keep-db)`);
  fs.mkdirSync(runtimeRoot, { recursive: true });
  for (const entry of fs.readdirSync(runtimeRoot, { withFileTypes: true })) {
    if (runtimeStateDirs.has(entry.name)) continue;
    fs.rmSync(path.join(runtimeRoot, entry.name), { recursive: true, force: true });
  }
};

const copyEntry = (src, dst) => {
  if (shouldSkip(src)) return;
  const stat = fs.lstatSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyEntry(path.join(src, entry), path.join(dst, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  fs.chmodSync(dst, stat.mode);
};

const syncSource = () => {
  console.log("[aios-test] copy source");
  for (const entry of fs.readdirSync(sourceRoot)) {
    copyEntry(path.join(sourceRoot, entry), path.join(runtimeRoot, entry));
  }
};

const linkOrInstallNodeModules = () => {
  const sourceModules = path.join(sourceRoot, "node_modules");
  const targetModules = path.join(runtimeRoot, "node_modules");
  fs.rmSync(targetModules, { recursive: true, force: true });
  if (fs.existsSync(sourceModules)) {
    fs.symlinkSync(sourceModules, targetModules, "dir");
    return;
  }
  run("install dependencies", "npm", ["ci", "--ignore-scripts"]);
};

const bakeLanguage = () => {
  run(`bake ${locale} language pack`, process.execPath, ["scripts/start.mjs", locale, "--force"]);
};

const buildUi = () => {
  run("build ui", process.execPath, ["node_modules/vite/bin/vite.js", "build", "--config", "ui/vite.config.js", "ui"], {
    env: {
      AIOS_MAIN_PORT: mainPort,
      AGENT_PORT: mainPort,
    },
  });
};

const children = [];
let shuttingDown = false;

const start = (label, command, args, env = {}) => {
  const child = spawn(command, args, {
    cwd: runtimeRoot,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  child.on("exit", (code, signal) => {
    if (!shuttingDown) {
      console.error(`[aios-test] ${label} exited: code=${code}, signal=${signal}`);
      shutdown(1);
    }
  });
  children.push(child);
};

const startServices = () => {
  console.log("[aios-test] start services");
  start("main", process.execPath, ["server/main/index.js", `--port=${mainPort}`], {
    AGENT_PORT: mainPort,
    AIOS_MAIN_PORT: mainPort,
    AGENT_APPS_PORT: appsPort,
    AIOS_APPS_PORT: appsPort,
  });
  start("apps", process.execPath, ["server/apps/index.js"], {
    AGENT_APPS_PORT: appsPort,
    AIOS_APPS_PORT: appsPort,
    AIOS_MAIN_PORT: mainPort,
  });
  start("ui", process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", uiPort, "--config", "ui/vite.config.js", "ui"], {
    AIOS_MAIN_PORT: mainPort,
    AGENT_PORT: mainPort,
  });
};

const printUrls = () => {
  console.log("");
  console.log(`[aios-test] ui     http://127.0.0.1:${uiPort}`);
  console.log(`[aios-test] system http://127.0.0.1:${mainPort}/api/health`);
  console.log(`[aios-test] apps   http://127.0.0.1:${appsPort}/apps/health`);
  console.log("[aios-test] press Ctrl+C to stop");
};

const shutdown = (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    try {
      child.kill("SIGINT");
    } catch {}
  }
  setTimeout(() => process.exit(code), 300);
};

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

prepareRuntime();
syncSource();
linkOrInstallNodeModules();
bakeLanguage();
buildUi();
startServices();
printUrls();
