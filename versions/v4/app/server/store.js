// App 持久化真相：var/aios.db。SQLite 负责事务、顺序、分页与约束。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { VAR_DIR } from '../../host.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export { VAR_DIR };
const DB_FILE = path.join(VAR_DIR, 'aios.db');
const SCHEMA_FILE = path.join(ROOT, 'app', 'schema.sql');
const SOURCES = new Set(['user', 'runtime', 'model', 'tool']);

let db;

function database() {
  if (db) return db;
  fs.mkdirSync(VAR_DIR, { recursive: true });
  db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  // 老库把 items 表改名 messages。必须在建表前:否则下面 CREATE TABLE IF NOT EXISTS messages
  // 会先建一张空表,老数据被晾在 items 里丢掉。幂等:只在有 items、无 messages 时做。
  const hasTable = (name) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
  if (hasTable('items') && !hasTable('messages')) {
    db.exec('ALTER TABLE items RENAME TO messages; DROP INDEX IF EXISTS items_latest;');
  }
  db.exec(fs.readFileSync(SCHEMA_FILE, 'utf8'));
  // schema.sql 只建新表;已有库的新列用 ALTER 补
  if (!db.prepare('PRAGMA table_info(chats)').all().some((col) => col.name === 'pinned_at')) {
    db.exec('ALTER TABLE chats ADD COLUMN pinned_at TEXT');
  }
  if (!db.prepare('PRAGMA table_info(restarts)').all().some((col) => col.name === 'target_chat')) {
    db.exec('ALTER TABLE restarts ADD COLUMN target_chat TEXT');
  }
  return db;
}

function decodeRow(row) {
  if (!row) return null;
  return {
    seq: row.seq,
    source: row.source,
    item: JSON.parse(row.item),
    at: row.at,
    ...(row.usage ? { usage: JSON.parse(row.usage) } : {}),
  };
}

export function ensureVarDir() { database(); }

export function createChat({ title = '', description = '' } = {}) {
  const id = crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  database().prepare(`INSERT INTO chats
    (id, title, description, context_start, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)`)
    .run(id, title, description, now, now);
  return getChat(id);
}

export function getChat(id) {
  // usage 累计来自 usage(appendItem 增量维护),读取 O(1)
  return database().prepare(`SELECT chats.id, title, description, context_start, pinned_at, created_at, updated_at,
    COALESCE(u.input, 0) AS usage_input, COALESCE(u.cached, 0) AS usage_cached, COALESCE(u.output, 0) AS usage_output
    FROM chats LEFT JOIN usage AS u ON u.chat_id = chats.id WHERE chats.id = ?`).get(id) ?? null;
}

export function listChats() {
  return database().prepare(`SELECT id, title, description, context_start, pinned_at, created_at, updated_at
    FROM chats ORDER BY updated_at DESC`).all();
}

export function updateChat(id, changes) {
  const current = getChat(id);
  if (!current) return null;
  const title = changes.title !== undefined ? changes.title : current.title;
  const description = changes.description !== undefined ? changes.description : current.description;
  const contextStart = changes.context_start !== undefined ? changes.context_start : current.context_start;
  const now = new Date().toISOString();
  const pinnedAt = changes.pinned !== undefined ? (changes.pinned ? now : null) : current.pinned_at;
  // updated_at 是「最后活跃」,给最近组排序用;置顶/取消置顶不算活跃
  const touched = changes.title !== undefined || changes.description !== undefined || changes.context_start !== undefined;
  database().prepare(`UPDATE chats SET title = ?, description = ?, context_start = ?, pinned_at = ?, updated_at = ? WHERE id = ?`)
    .run(title, description, contextStart, pinnedAt, touched ? now : current.updated_at, id);
  return getChat(id);
}

export function removeChat(id) {
  return database().prepare('DELETE FROM chats WHERE id = ?').run(id).changes > 0;
}

export function readItems(id, { afterSeq = 0 } = {}) {
  return database().prepare(`SELECT seq, source, item, usage, at FROM messages
    WHERE chat_id = ? AND seq > ? ORDER BY seq ASC`).all(id, afterSeq).map(decodeRow);
}

export function readItemsPage(id, { beforeSeq = Number.MAX_SAFE_INTEGER, limit = 50 } = {}) {
  const size = Number.isInteger(limit) ? Math.min(Math.max(1, limit), 200) : 50;
  const rows = database().prepare(`SELECT seq, source, item, usage, at FROM messages
    WHERE chat_id = ? AND seq < ? ORDER BY seq DESC LIMIT ?`).all(id, beforeSeq, size).reverse().map(decodeRow);

  // 页边界如果从工具输出开始，补入对应的 function_call。
  const present = new Set(rows.filter((row) => row.item.type === 'function_call').map((row) => row.item.call_id));
  const missing = new Set(rows
    .filter((row) => row.item.type === 'function_call_output' && !present.has(row.item.call_id))
    .map((row) => row.item.call_id));
  for (const callId of missing) {
    const row = database().prepare(`SELECT seq, source, item, usage, at FROM messages
      WHERE chat_id = ? AND json_extract(item, '$.type') = 'function_call'
        AND json_extract(item, '$.call_id') = ? ORDER BY seq DESC LIMIT 1`).get(id, callId);
    if (row) rows.unshift(decodeRow(row));
  }
  rows.sort((a, b) => a.seq - b.seq);
  const oldest = rows[0]?.seq ?? beforeSeq;
  const hasMore = !!database().prepare('SELECT 1 FROM messages WHERE chat_id = ? AND seq < ? LIMIT 1').get(id, oldest);
  return { items: rows, hasMore };
}

export function appendItem(id, { source, item, usage }) {
  if (!SOURCES.has(source)) throw new Error(`非法 source: ${source}`);
  if (!getChat(id)) throw new Error(`对话不存在: ${id}`);
  const conn = database();
  conn.exec('BEGIN IMMEDIATE');
  try {
    const seq = conn.prepare('SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM messages WHERE chat_id = ?').get(id).seq;
    const at = new Date().toISOString();
    conn.prepare(`INSERT INTO messages(chat_id, seq, source, item, usage, at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, seq, source, JSON.stringify(item), usage ? JSON.stringify(usage) : null, at);
    if (usage) {
      // usage 累计同事务增量维护,和 messages 落库天然一致
      conn.prepare(`INSERT INTO usage(chat_id, input, cached, output) VALUES (?, ?, ?, ?)
        ON CONFLICT(chat_id) DO UPDATE SET
          input = input + excluded.input, cached = cached + excluded.cached, output = output + excluded.output`)
        .run(id,
          Number(usage.input_tokens) || 0,
          Number(usage.input_tokens_details?.cached_tokens) || 0,
          Number(usage.output_tokens) || 0);
    }
    conn.prepare('UPDATE chats SET updated_at = ? WHERE id = ?').run(at, id);
    conn.exec('COMMIT');
    return { seq, source, item, at, ...(usage ? { usage } : {}) };
  } catch (err) {
    conn.exec('ROLLBACK');
    throw err;
  }
}

// ── 设置(只存被改过的键)──────────────────────────────────────

export function allSettings() {
  const out = {};
  for (const row of database().prepare('SELECT key, value FROM settings').all()) {
    try { out[row.key] = JSON.parse(row.value); } catch { /* 值坏了就当没设置过 */ }
  }
  return out;
}

export function writeSetting(key, value) {
  database().prepare(`INSERT INTO settings(key, value, at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, at = excluded.at`)
    .run(key, JSON.stringify(value), new Date().toISOString());
}

export function clearSetting(key) {
  database().prepare('DELETE FROM settings WHERE key = ?').run(key);
}

// ── 上下文压缩(compaction)────────────────────────────────────

export function allCompactions(chatId) {
  return database().prepare(`SELECT start_seq, end_seq, summary, kind, tokens FROM compactions
    WHERE chat_id = ? ORDER BY end_seq ASC`).all(chatId);
}

export function insertCompaction(chatId, { startSeq, endSeq, summary, kind, tokens = 0 }) {
  database().prepare(`INSERT OR REPLACE INTO compactions
    (chat_id, start_seq, end_seq, summary, kind, tokens, at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(chatId, startSeq, endSeq, summary, kind, tokens, new Date().toISOString());
}

// ── 待办(todo 应用的表)────────────────────────────────────────
const decodeTodo = (row) => (row ? { ...row, done: !!row.done } : null);

export function listTodos() {
  // 未完成按创建倒序(新的在上),已完成按最近完成在前;分组由界面做
  return database().prepare(`SELECT id, title, done, created_at, updated_at FROM todos
    ORDER BY done ASC, CASE WHEN done THEN updated_at ELSE created_at END DESC`).all().map(decodeTodo);
}

export function createTodo(title) {
  const id = crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  database().prepare('INSERT INTO todos(id, title, done, created_at, updated_at) VALUES (?, ?, 0, ?, ?)')
    .run(id, title, now, now);
  return decodeTodo(database().prepare('SELECT id, title, done, created_at, updated_at FROM todos WHERE id = ?').get(id));
}

export function updateTodo(id, changes) {
  const current = database().prepare('SELECT id, title, done FROM todos WHERE id = ?').get(id);
  if (!current) return null;
  const title = changes.title !== undefined ? changes.title : current.title;
  const done = changes.done !== undefined ? (changes.done ? 1 : 0) : current.done;
  database().prepare('UPDATE todos SET title = ?, done = ?, updated_at = ? WHERE id = ?')
    .run(title, done, new Date().toISOString(), id);
  return decodeTodo(database().prepare('SELECT id, title, done, created_at, updated_at FROM todos WHERE id = ?').get(id));
}

export function removeTodo(id) {
  return database().prepare('DELETE FROM todos WHERE id = ?').run(id).changes > 0;
}

export function clearDoneTodos() {
  return database().prepare('DELETE FROM todos WHERE done = 1').run().changes;
}

// ── 记忆(memory 应用的表)──────────────────────────────────────
const decodeMemory = (row) => {
  if (!row) return null;
  let tags = [];
  try { tags = JSON.parse(row.tags); } catch { tags = []; }
  return { ...row, tags, pinned: !!row.pinned };
};

// tags 可以是字符串数组或逗号分隔字符串;统一成去重去空的小写数组,最多 12 个
function normalizeTags(tags) {
  const raw = Array.isArray(tags) ? tags : String(tags ?? '').split(/[,，]/);
  return [...new Set(raw.map((t) => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 12);
}

export function listMemories({ tag } = {}) {
  const conn = database();
  if (tag) {
    return conn.prepare(`SELECT id, title, body, tags, pinned, source, created_at, updated_at FROM memories
      WHERE EXISTS (SELECT 1 FROM json_each(memories.tags) WHERE json_each.value = ?)
      ORDER BY pinned DESC, updated_at DESC`).all(tag).map(decodeMemory);
  }
  return conn.prepare(`SELECT id, title, body, tags, pinned, source, created_at, updated_at FROM memories
    ORDER BY pinned DESC, updated_at DESC`).all().map(decodeMemory);
}

export function getMemory(id) {
  return decodeMemory(database().prepare(`SELECT id, title, body, tags, pinned, source, created_at, updated_at
    FROM memories WHERE id = ?`).get(id));
}

export function createMemory({ title, body = '', tags = [], source = 'manual' }) {
  if (typeof title !== 'string' || !title.trim()) throw new Error('title 必须是非空字符串');
  if (typeof body !== 'string') throw new Error('body 必须是字符串');
  const id = crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  database().prepare(`INSERT INTO memories(id, title, body, tags, pinned, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, ?, ?, ?)`)
    .run(id, title.trim(), body, JSON.stringify(normalizeTags(tags)), source, now, now);
  return getMemory(id);
}

export function updateMemory(id, changes) {
  const current = getMemory(id);
  if (!current) return null;
  const title = changes.title !== undefined ? (typeof changes.title === 'string' && changes.title.trim() ? changes.title.trim() : '') : current.title;
  const body = changes.body !== undefined ? (typeof changes.body === 'string' ? changes.body : '') : current.body;
  const tags = changes.tags !== undefined ? normalizeTags(changes.tags) : current.tags;
  const pinned = changes.pinned !== undefined ? (changes.pinned ? 1 : 0) : (current.pinned ? 1 : 0);
  if (!title) throw new Error('title 必须是非空字符串');
  database().prepare(`UPDATE memories SET title = ?, body = ?, tags = ?, pinned = ?, updated_at = ? WHERE id = ?`)
    .run(title, body, JSON.stringify(tags), pinned, new Date().toISOString(), id);
  return getMemory(id);
}

export function removeMemory(id) {
  return database().prepare('DELETE FROM memories WHERE id = ?').run(id).changes > 0;
}

export function memoryTags() {
  return database().prepare(`SELECT json_each.value AS tag, COUNT(*) AS count
    FROM memories, json_each(memories.tags)
    GROUP BY json_each.value ORDER BY count DESC, tag ASC`).all();
}

export function createRestartRequest({ summary, reason = '', target_chat = null }) {
  if (typeof summary !== 'string' || !summary.trim()) throw new Error('summary 必须是非空字符串');
  if (typeof reason !== 'string') throw new Error('reason 必须是字符串');
  if (target_chat !== null && typeof target_chat !== 'string') throw new Error('target_chat 必须是字符串或 null');
  const conn = database();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  conn.exec('BEGIN IMMEDIATE');
  try {
    conn.prepare("UPDATE restarts SET status = 'cancelled', completed_at = ? WHERE status = 'pending'").run(now);
    conn.prepare(`INSERT INTO restarts(id, summary, reason, status, created_at, target_chat)
      VALUES (?, ?, ?, 'pending', ?, ?)`).run(id, summary.trim(), reason, now, target_chat);
    conn.exec('COMMIT');
    return getRestartRequest(id);
  } catch (err) {
    conn.exec('ROLLBACK');
    throw err;
  }
}

export function getRestartRequest(id) {
  return database().prepare(`SELECT id, summary, reason, status, created_at, confirmed_at, completed_at, instance_id, target_chat
    FROM restarts WHERE id = ?`).get(id) ?? null;
}

export function getPendingRestart() {
  return database().prepare(`SELECT id, summary, reason, status, created_at, confirmed_at, completed_at, instance_id, target_chat
    FROM restarts WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1`).get() ?? null;
}

export function confirmRestartRequest(id) {
  const now = new Date().toISOString();
  const result = database().prepare(`UPDATE restarts SET status = 'restarting', confirmed_at = ?
    WHERE id = ? AND status = 'pending'`).run(now, id);
  return result.changes ? getRestartRequest(id) : null;
}

export function cancelRestartRequest(id) {
  const now = new Date().toISOString();
  const result = database().prepare(`UPDATE restarts SET status = 'cancelled', completed_at = ?
    WHERE id = ? AND status = 'pending'`).run(now, id);
  return result.changes > 0;
}

export function completeRestartRequests(instanceId) {
  const now = new Date().toISOString();
  database().prepare(`UPDATE restarts
    SET status = 'succeeded', completed_at = ?, instance_id = ? WHERE status = 'restarting'`)
    .run(now, instanceId);
}

// ── 用量/成本(app/ui/src/apps/usage)────────────────────────────────
// messages 表里带 usage 的行是计费口径:每条模型响应一次追加,累加即总消耗。
// 这里按时间桶/对话聚合 token 并换算成本。价格参数由 api.js 从配置传入,
// 单价以「币种/百万 tokens」计。
const numTok = (row, field) => Number(row[field]) || 0;

function readUsageRows() {
  return database().prepare(`SELECT m.chat_id, c.title, m.at,
    json_extract(m.usage, '$.input_tokens') AS input_tokens,
    json_extract(m.usage, '$.output_tokens') AS output_tokens,
    json_extract(m.usage, '$.input_tokens_details.cached_tokens') AS cached_tokens
    FROM messages m JOIN chats c ON c.id = m.chat_id
    WHERE m.usage IS NOT NULL ORDER BY m.at ASC`).all();
}

// 成本:input 里命中缓存的部分按缓存价,其余按输入价;输出按输出价。
// priceCachedPerMTokens 这版语义为「0 = 不打折,按输入价算」。
export function usageCost(input, output, cached, prices) {
  const pin = Number(prices?.input) || 0;
  const pc = Number(prices?.cached) > 0 ? Number(prices?.cached) : pin;
  const pout = Number(prices?.output) || 0;
  const fresh = Math.max(0, (Number(input) || 0) - (Number(cached) || 0));
  return (fresh * pin + (Number(cached) || 0) * pc + (Number(output) || 0) * pout) / 1e6;
}

export function usageOverview(prices) {
  const rows = readUsageRows();
  let input = 0, output = 0, cached = 0;
  for (const r of rows) {
    input += numTok(r, 'input_tokens');
    output += numTok(r, 'output_tokens');
    cached += numTok(r, 'cached_tokens');
  }
  return {
    input, output, cached,
    cost: usageCost(input, output, cached, prices),
    requests: rows.length,
    from: rows[0]?.at ?? null,
    to: rows[rows.length - 1]?.at ?? null,
  };
}

// 时间桶:按本地时的「小时」或「日」切分。bucket 是本地时间拼的可排序 key,
// label 给前端直接显示,避免两端反复换算时区。
function bucketOf(at, granularity) {
  const d = new Date(at);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  if (granularity === 'hour') {
    return {
      bucket: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00:00`,
      label: `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:00`,
    };
  }
  return {
    bucket: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T00:00:00`,
    label: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
  };
}

export function usageTrend(granularity = 'day', prices) {
  const buckets = new Map();
  for (const r of readUsageRows()) {
    const { bucket, label } = bucketOf(r.at, granularity);
    let b = buckets.get(bucket);
    if (!b) { b = { bucket, label, input: 0, output: 0, cached: 0, requests: 0 }; buckets.set(bucket, b); }
    b.input += numTok(r, 'input_tokens');
    b.output += numTok(r, 'output_tokens');
    b.cached += numTok(r, 'cached_tokens');
    b.requests += 1;
  }
  return [...buckets.values()]
    .sort((a, b) => a.bucket.localeCompare(b.bucket))
    .map((b) => ({ ...b, cost: usageCost(b.input, b.output, b.cached, prices) }));
}

export function usageByChat(prices) {
  const chats = new Map();
  for (const r of readUsageRows()) {
    let c = chats.get(r.chat_id);
    if (!c) { c = { id: r.chat_id, title: r.title, input: 0, output: 0, cached: 0, requests: 0, at: r.at }; chats.set(r.chat_id, c); }
    c.input += numTok(r, 'input_tokens');
    c.output += numTok(r, 'output_tokens');
    c.cached += numTok(r, 'cached_tokens');
    c.requests += 1;
    if (r.at > c.at) c.at = r.at;
  }
  return [...chats.values()]
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((c) => ({ ...c, cost: usageCost(c.input, c.output, c.cached, prices) }));
}

// 单个对话的用量详情:总览 + 该对话自己的时间趋势 + 最近逐条记录。
// messages 只保留最近 60 条,避免详情页一次拉太多。
function readUsageRowsForChat(id) {
  return database().prepare(`SELECT m.chat_id, c.title, m.at, m.seq,
    json_extract(m.usage, '$.input_tokens') AS input_tokens,
    json_extract(m.usage, '$.output_tokens') AS output_tokens,
    json_extract(m.usage, '$.input_tokens_details.cached_tokens') AS cached_tokens
    FROM messages m JOIN chats c ON c.id = m.chat_id
    WHERE m.usage IS NOT NULL AND m.chat_id = ? ORDER BY m.at ASC`).all(id);
}

export function usageChat(id, granularity = 'day', prices) {
  const rows = readUsageRowsForChat(id);
  const title = rows[0]?.title ?? '';
  const totals = { input: 0, output: 0, cached: 0 };
  const buckets = new Map();
  const messages = [];
  for (const r of rows) {
    totals.input += numTok(r, 'input_tokens');
    totals.output += numTok(r, 'output_tokens');
    totals.cached += numTok(r, 'cached_tokens');
    const { bucket, label } = bucketOf(r.at, granularity);
    let b = buckets.get(bucket);
    if (!b) { b = { bucket, label, input: 0, output: 0, cached: 0, requests: 0 }; buckets.set(bucket, b); }
    b.input += numTok(r, 'input_tokens');
    b.output += numTok(r, 'output_tokens');
    b.cached += numTok(r, 'cached_tokens');
    b.requests += 1;
    messages.push({
      seq: r.seq, at: r.at,
      input: numTok(r, 'input_tokens'),
      output: numTok(r, 'output_tokens'),
      cached: numTok(r, 'cached_tokens'),
      cost: usageCost(numTok(r, 'input_tokens'), numTok(r, 'output_tokens'), numTok(r, 'cached_tokens'), prices),
    });
  }
  messages.reverse(); // 最近的在最上面
  const points = [...buckets.values()]
    .sort((a, b) => a.bucket.localeCompare(b.bucket))
    .map((b) => ({ ...b, cost: usageCost(b.input, b.output, b.cached, prices) }));
  return {
    id, title,
    input: totals.input, output: totals.output, cached: totals.cached,
    cost: usageCost(totals.input, totals.output, totals.cached, prices),
    requests: rows.length,
    at: rows.length ? rows[rows.length - 1].at : null,
    points,
    messages: messages.slice(0, 60),
  };
}
