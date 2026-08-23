// Kernel 入口：只启动 run API，不启动或管理 App。
//   node kernel/index.js   启动 Kernel
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './paths.js';
import { HOME, ENV_FILE, readConfig } from '../host.js';
import { startServer } from './api.js';
import { stopAll } from './run.js';

function loadConfig() {
  const config = readConfig();
  if (!config) {
    console.error(`缺少 ${ENV_FILE}。请先:cp etc/env.example.json etc/env.json 并填写模型服务配置。`);
    process.exit(1);
  }
  config.kernelPort ??= 9522;
  config.appPort ??= 9523;
  config.bashTimeoutMs ??= 600_000;
  config.bashDefaultTimeoutMs ??= 30_000;
  config.bashMinTimeoutMs ??= 1_000;
  config.toolTimeoutMs ??= 600_000;
  config.toolOutputMaxChars ??= 50_000;
  config.requestBodyMaxBytes ??= 1_048_576;
  config.sseEventMaxBytes ??= 1_048_576;
  config.guardTimeoutMs ??= 5_000;
  config.shutdownTimeoutMs ??= 5_000;
  config.contextWindowTokens ??= 128_000;
  config.workdir = config.workdir ? path.resolve(HOME, config.workdir) : HOME;
  config.guard = config.guard ? path.resolve(ROOT, config.guard) : null;
  return config;
}

function loadInstructions() {
  try {
    return fs.readFileSync(path.join(ROOT, 'etc', 'instructions.md'), 'utf8');
  } catch {
    return '';
  }
}

const config = loadConfig();
const instructions = loadInstructions();
const server = startServer({ config, instructions });
let closing = false;
const shutdown = () => {
  if (closing) return;
  closing = true;
  stopAll();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), config.shutdownTimeoutMs ?? 5_000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
console.log(`[kernel] http://127.0.0.1:${config.kernelPort} · ephemeral runs · workdir=${config.workdir}`);
