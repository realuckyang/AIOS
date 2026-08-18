// App 对 etc/config.json 的受控读写；字段清单也是设置 API 的契约。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = path.join(ROOT, 'etc', 'config.json');

export const STRING_FIELDS = new Set(['responsesUrl', 'apiKey', 'model', 'guard', 'tools', 'workdir', 'priceCurrency']);
export const NUMBER_FIELDS = new Set([
  'kernelPort', 'appPort',
  'bashTimeoutMs', 'bashDefaultTimeoutMs', 'bashMinTimeoutMs',
  'toolTimeoutMs', 'toolOutputMaxChars', 'requestBodyMaxBytes', 'sseEventMaxBytes',
  'eventBufferSize', 'guardTimeoutMs', 'bootReadyTimeoutMs', 'bootBackoffMaxMs',
  'shutdownTimeoutMs', 'consoleConnectTimeoutMs',
  'contextWindowTokens', 'priceInputPerMTokens', 'priceCachedPerMTokens', 'priceOutputPerMTokens',
]);

const DEFAULTS = {
  responsesUrl: '', apiKey: '', model: '', kernelPort: 9522, appPort: 9523,
  guard: 'bin/guard', tools: 'etc/tools.json', workdir: '',
  bashTimeoutMs: 600_000, bashDefaultTimeoutMs: 30_000, bashMinTimeoutMs: 1_000,
  toolTimeoutMs: 600_000, toolOutputMaxChars: 50_000,
  requestBodyMaxBytes: 26_214_400, sseEventMaxBytes: 1_048_576, eventBufferSize: 1_000,
  guardTimeoutMs: 5_000, bootReadyTimeoutMs: 15_000, bootBackoffMaxMs: 60_000,
  shutdownTimeoutMs: 5_000, consoleConnectTimeoutMs: 1_500,
  // 状态行用:上下文窗口与价格(单位 = 币种/百万 tokens;in/out 都为 0 时不显示花费;
  // cached 是缓存命中输入的单价,0 = 不打折按输入价算)
  contextWindowTokens: 128_000, priceInputPerMTokens: 0, priceCachedPerMTokens: 0, priceOutputPerMTokens: 0, priceCurrency: '¥',
};

export function applyConfigDefaults(config) {
  for (const [key, value] of Object.entries(DEFAULTS)) config[key] ??= value;
  return config;
}

export function publicConfig(config) {
  return Object.fromEntries([...STRING_FIELDS, ...NUMBER_FIELDS].map((key) => [key, config[key]]));
}

export function updateConfig(current, changes) {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) throw new Error('配置必须是对象');
  const next = { ...current };
  for (const [key, value] of Object.entries(changes)) {
    if (STRING_FIELDS.has(key)) {
      if (typeof value !== 'string') throw new Error(`${key} 必须是字符串`);
      next[key] = value;
    } else if (NUMBER_FIELDS.has(key)) {
      if (!Number.isInteger(value) || value < 0) throw new Error(`${key} 必须是非负整数`);
      if ((key === 'kernelPort' || key === 'appPort') && (value < 1 || value > 65535)) {
        throw new Error(`${key} 必须在 1–65535 之间`);
      }
      next[key] = value;
    } else {
      throw new Error(`未知配置项: ${key}`);
    }
  }
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, FILE);
  Object.assign(current, next);
  return current;
}
