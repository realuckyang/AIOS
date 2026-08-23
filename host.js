// 宿主环境的唯一入口。
// Boot 通过环境变量交出 VAR/RUN 与 env.json 的位置;脱离 Boot 单独运行时
// 按本文件所在位置回推同一套路径,两种模式看到的目录完全一致。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// HOME 是系统根:boot.js、etc/、var/、run/、app/、kernel/ 都在这里。
export const HOME = process.env.AIOS_HOME || path.dirname(fileURLToPath(import.meta.url));
export const VAR_DIR = process.env.AIOS_VAR || path.join(HOME, 'var');
export const RUN_DIR = process.env.AIOS_RUN || path.join(HOME, 'run');
export const ETC_DIR = path.join(HOME, 'etc');
export const ENV_FILE = process.env.AIOS_ENV || path.join(ETC_DIR, 'env.json');
export const LIMITS_FILE = path.join(ETC_DIR, 'limits.json');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw new Error(`${file} 解析失败:${err.message}`);
  }
}

export function readEnv() {
  return readJson(ENV_FILE);
}

export function readLimits() {
  return readJson(LIMITS_FILE) ?? {};
}

// 内核与 App 拿到的都是同一个合并视图:凭据端口在 env,行为参数在 limits。
export function readConfig() {
  const env = readEnv();
  if (!env) return null;
  return { ...readLimits(), ...env };
}
