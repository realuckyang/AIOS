import { db } from './database.js';

const query = {
  get: db.prepare('SELECT key, value FROM settings WHERE key = ?'),
  list: db.prepare('SELECT key, value FROM settings ORDER BY key'),
  set: db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`),
};

const allowed = new Set([
  'llm.responses_url', 'llm.key', 'llm.model', 'context.window', 'context.reserve', 'context.keep_recent',
  'context.live_result_chars', 'prompt.chat', 'prompt.compaction',
]);
const numeric = new Set([
  'context.window', 'context.reserve', 'context.keep_recent', 'context.live_result_chars',
]);

export function get(key) {
  const row = query.get.get(key);
  if (!row) throw new Error(`缺少配置：${key}`);
  return row.value;
}

export function number(key) {
  const value = Number(get(key));
  if (!Number.isFinite(value)) throw Object.assign(new Error(`配置 ${key} 必须是数字`), { status: 400 });
  return value;
}

export function list() {
  return Object.fromEntries(query.list.all().map((row) => [row.key, row.value]));
}

export function set(key, value) {
  if (!allowed.has(key)) throw Object.assign(new Error(`未知配置：${key}`), { status: 400 });
  if (value === undefined || value === null) throw Object.assign(new Error('value 不能为空'), { status: 400 });
  if (numeric.has(key) && (!Number.isFinite(Number(value)) || Number(value) <= 0)) {
    throw Object.assign(new Error(`${key} 必须是正数`), { status: 400 });
  }
  query.set.run(key, String(value));
  return get(key);
}
