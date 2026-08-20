// 版本对宿主环境的唯一入口。
// Boot 通过环境变量交出 HOME/VAR/RUN 与 env.json 的位置；脱离 Boot 单独运行时
// 按本文件所在位置回推同一套路径，两种模式看到的目录完全一致。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const VERSION_DIR = path.dirname(fileURLToPath(import.meta.url));
export const VERSION_ID = process.env.AIOS_VERSION || path.basename(VERSION_DIR);
export const ROLE = process.env.AIOS_ROLE || 'current';

// HOME 是系统根：boot.js、etc/、var/、run/、versions/ 都在这里。
export const HOME = process.env.AIOS_HOME || path.resolve(VERSION_DIR, '..', '..');
export const VAR_DIR = process.env.AIOS_VAR || path.join(HOME, 'var');
export const RUN_DIR = process.env.AIOS_RUN || path.join(HOME, 'run');
export const ENV_FILE = process.env.AIOS_ENV || path.join(HOME, 'etc', 'env.json');
export const LIMITS_FILE = path.join(VERSION_DIR, 'etc', 'limits.json');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw new Error(`${file} 解析失败：${err.message}`);
  }
}

export function readEnv() {
  return readJson(ENV_FILE);
}

export function readLimits() {
  return readJson(LIMITS_FILE) ?? {};
}

// 内核与 App 拿到的都是同一个合并视图：环境在外、行为参数在版本内。
export function readConfig() {
  const env = readEnv();
  if (!env) return null;
  return { ...readLimits(), ...env };
}
