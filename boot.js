// AIOS 总启动器：只做两件事 —— 启动、给环境。
// Kernel 与 App 是平级子进程，Kernel 不负责进程编排。
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOME = path.dirname(fileURLToPath(import.meta.url));
const RUN_DIR = path.join(HOME, 'run');
const VAR_DIR = path.join(HOME, 'var');
const ETC_DIR = path.join(HOME, 'etc');
const PID_FILE = path.join(RUN_DIR, 'boot.pid');
const ENV_FILE = path.join(ETC_DIR, 'env.json');

const KERNEL_ENTRY = 'kernel/index.js';
const APP_ENTRY = 'app/index.js';

function readJson(file, hint) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`[boot] 缺少 ${path.relative(HOME, file)}${hint ? `。${hint}` : ''}`);
      process.exit(1);
    }
    console.error(`[boot] ${path.relative(HOME, file)} 解析失败：${err.message}`);
    process.exit(1);
  }
}

const env = readJson(ENV_FILE, '请先：cp etc/env.example.json etc/env.json 并填写模型服务配置。');
env.kernelPort ??= 9522;
env.appPort ??= 9523;
env.bootReadyTimeoutMs ??= 15_000;
env.bootBackoffMaxMs ??= 60_000;
env.shutdownTimeoutMs ??= 5_000;

// ---- 进程 --------------------------------------------------------------

function alive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function acquirePid() {
  fs.mkdirSync(RUN_DIR, { recursive: true });
  try {
    const existing = Number(fs.readFileSync(PID_FILE, 'utf8').trim());
    if (Number.isInteger(existing) && existing > 1 && alive(existing)) {
      throw new Error(`AIOS 已在运行（boot PID ${existing}）`);
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  fs.writeFileSync(PID_FILE, `${process.pid}\n`);
}

function cleanupPid() {
  try {
    if (fs.readFileSync(PID_FILE, 'utf8').trim() === String(process.pid)) fs.unlinkSync(PID_FILE);
  } catch { /* PID 文件不存在或已属于新进程 */ }
}

// 环境由 Boot 单向交出：路径与端口进环境变量，凭据只给位置不给值。
function launch(label, entry) {
  const child = spawn(process.execPath, [path.join(HOME, entry)], {
    cwd: HOME,
    stdio: 'inherit',
    env: {
      ...process.env,
      AIOS_HOME: HOME,
      AIOS_ENV: ENV_FILE,
      AIOS_VAR: VAR_DIR,
      AIOS_RUN: RUN_DIR,
      KERNEL_PORT: String(env.kernelPort),
      APP_PORT: String(env.appPort),
    },
  });
  console.log(`[boot] ${label} PID ${child.pid}`);
  return child;
}

const timers = new Set();
const plannedAppStops = new WeakSet();
let stopping = false;
let restartingApp = false;
let generation = 0;
let kernelChild = null;
let appChild = null;
let kernelBackoff = 1000;
let appBackoff = 1000;

function later(fn, ms) {
  const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms);
  timers.add(timer);
}

function waitForExit(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => child.once('exit', resolve));
}

async function waitForKernel(child) {
  const deadline = Date.now() + env.bootReadyTimeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error('Kernel 启动失败');
    try {
      const res = await fetch(`http://127.0.0.1:${env.kernelPort}/api/runs/__boot__`);
      if (res.ok && child.exitCode === null) return;
    } catch { /* 监听尚未就绪 */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('等待 Kernel 就绪超时');
}

function startApp(epoch) {
  if (stopping || epoch !== generation || !kernelChild || kernelChild.exitCode !== null) return;
  const child = launch('App', APP_ENTRY);
  appChild = child;
  const startedAt = Date.now();
  child.once('exit', (code, signal) => {
    if (appChild === child) appChild = null;
    if (plannedAppStops.delete(child)) return;
    if (stopping || epoch !== generation) return;
    if (Date.now() - startedAt > env.bootBackoffMaxMs) appBackoff = 1000;
    const delay = appBackoff;
    appBackoff = Math.min(appBackoff * 2, env.bootBackoffMaxMs);
    console.log(`[boot] App 退出（code=${code}, signal=${signal}），${delay / 1000}s 后重启`);
    later(() => startApp(epoch), delay);
  });
}

// SIGHUP：重启 App（代码改了即生效，Kernel 不动）。
async function restartApp() {
  if (stopping || restartingApp || !kernelChild || kernelChild.exitCode !== null) return;
  restartingApp = true;
  const epoch = generation;
  const child = appChild;
  console.log('[boot] 收到 App 重启请求');
  try {
    if (child && child.exitCode === null) {
      plannedAppStops.add(child);
      child.kill('SIGTERM');
      await Promise.race([
        waitForExit(child),
        new Promise((resolve) => setTimeout(resolve, env.shutdownTimeoutMs)),
      ]);
      if (child.exitCode === null) child.kill('SIGKILL');
      await waitForExit(child);
    }
    if (!stopping && epoch === generation) {
      appBackoff = 1000;
      startApp(epoch);
    }
  } finally {
    restartingApp = false;
  }
}

async function startStack() {
  if (stopping) return;
  const epoch = ++generation;
  const child = launch('Kernel', KERNEL_ENTRY);
  kernelChild = child;
  const startedAt = Date.now();

  child.once('exit', (code, signal) => {
    if (kernelChild === child) kernelChild = null;
    if (stopping || epoch !== generation) return;
    generation += 1; // 使属于旧 Kernel 的 App 重启任务失效
    if (appChild && appChild.exitCode === null) appChild.kill('SIGTERM');
    if (Date.now() - startedAt > env.bootBackoffMaxMs) kernelBackoff = 1000;
    const delay = kernelBackoff;
    kernelBackoff = Math.min(kernelBackoff * 2, env.bootBackoffMaxMs);
    console.log(`[boot] Kernel 退出（code=${code}, signal=${signal}），${delay / 1000}s 后重启整套系统`);
    later(startStack, delay);
  });

  try {
    await waitForKernel(child);
    if (!stopping && epoch === generation) {
      console.log(`[boot] 已就绪：http://127.0.0.1:${env.appPort}`);
      startApp(epoch);
    }
  } catch (err) {
    if (!stopping && epoch === generation) {
      console.error(`[boot] ${err.message}`);
      if (child.exitCode === null) child.kill('SIGTERM');
    }
  }
}

async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  generation += 1;
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
  console.log(`[boot] 收到 ${signal}，停止 App 与 Kernel`);
  const children = [appChild, kernelChild].filter(Boolean);
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  await Promise.race([
    Promise.all(children.map(waitForExit)),
    new Promise((resolve) => setTimeout(resolve, env.shutdownTimeoutMs)),
  ]);
  for (const child of children) if (child.exitCode === null) child.kill('SIGKILL');
  cleanupPid();
  process.exit(0);
}

try {
  acquirePid();
} catch (err) {
  console.error(`[boot] ${err.message}`);
  process.exit(1);
}
process.once('exit', cleanupPid);
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGHUP', () => restartApp());
console.log(`[boot] AIOS PID ${process.pid}`);
startStack();
