// AIOS 总启动器：Kernel 与 App 是平级子进程，Kernel 不负责进程编排。
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const RUN_DIR = path.join(ROOT, 'run');
const PID_FILE = path.join(RUN_DIR, 'boot.pid');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'etc', 'config.json'), 'utf8'));
config.kernelPort ??= 9522;
config.appPort ??= 9523;
config.bootReadyTimeoutMs ??= 15_000;
config.bootBackoffMaxMs ??= 60_000;
config.shutdownTimeoutMs ??= 5_000;

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

function launch(label, entry) {
  const child = spawn(process.execPath, [path.join(ROOT, entry)], {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      KERNEL_PORT: String(config.kernelPort),
      APP_PORT: String(config.appPort),
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

async function waitForKernel(child) {
  const deadline = Date.now() + config.bootReadyTimeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error('Kernel 启动失败');
    try {
      const res = await fetch(`http://127.0.0.1:${config.kernelPort}/api/runs/__boot__`);
      if (res.ok && child.exitCode === null) return;
    } catch { /* 监听尚未就绪 */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('等待 Kernel 就绪超时');
}

function startApp(epoch) {
  if (stopping || epoch !== generation || !kernelChild || kernelChild.exitCode !== null) return;
  const child = launch('App', 'app/server/index.js');
  appChild = child;
  const startedAt = Date.now();
  child.once('exit', (code, signal) => {
    if (appChild === child) appChild = null;
    if (plannedAppStops.delete(child)) return;
    if (stopping || epoch !== generation) return;
    if (Date.now() - startedAt > config.bootBackoffMaxMs) appBackoff = 1000;
    const delay = appBackoff;
    appBackoff = Math.min(appBackoff * 2, config.bootBackoffMaxMs);
    console.log(`[boot] App 退出（code=${code}, signal=${signal}），${delay / 1000}s 后重启`);
    later(() => startApp(epoch), delay);
  });
}

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
        new Promise((resolve) => setTimeout(resolve, config.shutdownTimeoutMs)),
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
  const child = launch('Kernel', 'kernel/index.js');
  kernelChild = child;
  const startedAt = Date.now();

  child.once('exit', (code, signal) => {
    if (kernelChild === child) kernelChild = null;
    if (stopping || epoch !== generation) return;
    generation += 1; // 使属于旧 Kernel 的 App 重启任务失效
    if (appChild && appChild.exitCode === null) appChild.kill('SIGTERM');
    if (Date.now() - startedAt > config.bootBackoffMaxMs) kernelBackoff = 1000;
    const delay = kernelBackoff;
    kernelBackoff = Math.min(kernelBackoff * 2, config.bootBackoffMaxMs);
    console.log(`[boot] Kernel 退出（code=${code}, signal=${signal}），${delay / 1000}s 后重启整套系统`);
    later(startStack, delay);
  });

  try {
    await waitForKernel(child);
    if (!stopping && epoch === generation) {
      console.log(`[boot] Kernel 已就绪：http://127.0.0.1:${config.kernelPort}`);
      startApp(epoch);
    }
  } catch (err) {
    if (!stopping && epoch === generation) {
      console.error(`[boot] ${err.message}`);
      if (child.exitCode === null) child.kill('SIGTERM');
    }
  }
}

function waitForExit(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => child.once('exit', resolve));
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
    new Promise((resolve) => setTimeout(resolve, config.shutdownTimeoutMs)),
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
