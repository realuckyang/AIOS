// 内核入口与总装。
//   node kernel/index.js            启动内核(API + init 拉起 userland)
//   node kernel/index.js console [chat-id]   进入 CLI console
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, ensureDataDir } from './store.js';
import { startServer } from './api.js';
import { startInit } from './init.js';
import { runConsole } from './console.js';

function loadConfig() {
  const file = path.join(ROOT, 'config.json');
  if (!fs.existsSync(file)) {
    console.error('缺少 config.json。请先:cp config.json.example config.json 并填写模型服务配置。');
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  config.kernelPort ??= 9600;
  config.userlandPort ??= 9601;
  config.bashTimeoutMs ??= 600_000;
  config.workdir = config.workdir ? path.resolve(ROOT, config.workdir) : ROOT;
  config.guard = config.guard ? path.resolve(ROOT, config.guard) : null;
  return config;
}

function loadInstructions() {
  try {
    return fs.readFileSync(path.join(ROOT, 'instructions.md'), 'utf8');
  } catch {
    return '';
  }
}

const config = loadConfig();

if (process.argv[2] === 'console') {
  runConsole({ config, chatId: process.argv[3] });
} else {
  ensureDataDir();
  const instructions = loadInstructions();
  startServer({ config, instructions });
  console.log(`[kernel] http://127.0.0.1:${config.kernelPort} · data=${path.join(ROOT, 'data')} · workdir=${config.workdir}`);
  startInit({ config });
  if (config.init) console.log(`[kernel] init: ${config.init} → http://127.0.0.1:${config.userlandPort}`);
}
