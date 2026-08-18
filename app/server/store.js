// App 持久化真相：var/aios.db。SQLite 负责事务、顺序、分页与约束。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const VAR_DIR = path.join(ROOT, 'var');
const DB_FILE = path.join(VAR_DIR, 'aios.db');
const SCHEMA_FILE = path.join(ROOT, 'app', 'schema.sql');
const LEGACY_CHATS_DIR = path.join(VAR_DIR, 'chats');
const SOURCES = new Set(['user', 'runtime', 'model', 'tool']);

let db;

function database() {
  if (db) return db;
  fs.mkdirSync(VAR_DIR, { recursive: true });
  db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  db.exec(fs.readFileSync(SCHEMA_FILE, 'utf8'));
  // schema.sql 只建新表;已有库的新列用 ALTER 补
  if (!db.prepare('PRAGMA table_info(chats)').all().some((col) => col.name === 'pinned_at')) {
    db.exec('ALTER TABLE chats ADD COLUMN pinned_at TEXT');
  }
  if (!db.prepare('PRAGMA table_info(restart_requests)').all().some((col) => col.name === 'target_chat')) {
    db.exec('ALTER TABLE restart_requests ADD COLUMN target_chat TEXT');
  }
  migrateLegacyJsonl();
  backfillChatUsage();
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

function migrateLegacyJsonl() {
  const done = db.prepare("SELECT value FROM app_meta WHERE key = 'legacy_jsonl_import'").get();
  if (done) return;
  db.exec('BEGIN IMMEDIATE');
  try {
    if (fs.existsSync(LEGACY_CHATS_DIR)) {
      const insertChat = db.prepare(`INSERT OR IGNORE INTO chats
        (id, title, description, context_start, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`);
      const insertItem = db.prepare(`INSERT OR IGNORE INTO items
        (chat_id, seq, source, item, usage, at) VALUES (?, ?, ?, ?, ?, ?)`);
      for (const entry of fs.readdirSync(LEGACY_CHATS_DIR, { withFileTypes: true })) {
        if (!entry.isDirectory() || !/^[A-Za-z0-9_-]+$/.test(entry.name)) continue;
        const dir = path.join(LEGACY_CHATS_DIR, entry.name);
        try {
          const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
          insertChat.run(meta.id, meta.title ?? '', meta.description ?? '', meta.context_start ?? 0, meta.created_at, meta.updated_at);
          const raw = fs.readFileSync(path.join(dir, 'items.jsonl'), 'utf8');
          for (const line of raw.split('\n')) {
            if (!line.trim()) continue;
            try {
              const row = JSON.parse(line);
              insertItem.run(meta.id, row.seq, row.source, JSON.stringify(row.item), row.usage ? JSON.stringify(row.usage) : null, row.at);
            } catch { /* 保持旧版语义：跳过崩溃残留脏行 */ }
          }
        } catch (err) {
          console.warn(`[app] 跳过 JSONL 迁移 ${entry.name}: ${err.message}`);
        }
      }
    }
    db.prepare("INSERT INTO app_meta(key, value) VALUES ('legacy_jsonl_import', ?)").run(new Date().toISOString());
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// chat_usage 建表前的历史 usage 一次性回填;之后只走 appendItem 的增量维护
function backfillChatUsage() {
  const done = db.prepare("SELECT value FROM app_meta WHERE key = 'chat_usage_backfill'").get();
  if (done) return;
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(`INSERT INTO chat_usage(chat_id, input, cached, output)
      SELECT chat_id,
        COALESCE(SUM(json_extract(usage, '$.input_tokens')), 0),
        COALESCE(SUM(json_extract(usage, '$.input_tokens_details.cached_tokens')), 0),
        COALESCE(SUM(json_extract(usage, '$.output_tokens')), 0)
      FROM items
      WHERE usage IS NOT NULL AND chat_id NOT IN (SELECT chat_id FROM chat_usage)
      GROUP BY chat_id`);
    db.prepare("INSERT INTO app_meta(key, value) VALUES ('chat_usage_backfill', ?)").run(new Date().toISOString());
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
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
  // usage 累计来自 chat_usage(appendItem 增量维护),读取 O(1)
  return database().prepare(`SELECT chats.id, title, description, context_start, pinned_at, created_at, updated_at,
    COALESCE(u.input, 0) AS usage_input, COALESCE(u.cached, 0) AS usage_cached, COALESCE(u.output, 0) AS usage_output
    FROM chats LEFT JOIN chat_usage u ON u.chat_id = chats.id WHERE chats.id = ?`).get(id) ?? null;
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
  return database().prepare(`SELECT seq, source, item, usage, at FROM items
    WHERE chat_id = ? AND seq > ? ORDER BY seq ASC`).all(id, afterSeq).map(decodeRow);
}

export function readItemsPage(id, { beforeSeq = Number.MAX_SAFE_INTEGER, limit = 50 } = {}) {
  const size = Number.isInteger(limit) ? Math.min(Math.max(1, limit), 200) : 50;
  const rows = database().prepare(`SELECT seq, source, item, usage, at FROM items
    WHERE chat_id = ? AND seq < ? ORDER BY seq DESC LIMIT ?`).all(id, beforeSeq, size).reverse().map(decodeRow);

  // 页边界如果从工具输出开始，补入对应的 function_call。
  const present = new Set(rows.filter((row) => row.item.type === 'function_call').map((row) => row.item.call_id));
  const missing = new Set(rows
    .filter((row) => row.item.type === 'function_call_output' && !present.has(row.item.call_id))
    .map((row) => row.item.call_id));
  for (const callId of missing) {
    const row = database().prepare(`SELECT seq, source, item, usage, at FROM items
      WHERE chat_id = ? AND json_extract(item, '$.type') = 'function_call'
        AND json_extract(item, '$.call_id') = ? ORDER BY seq DESC LIMIT 1`).get(id, callId);
    if (row) rows.unshift(decodeRow(row));
  }
  rows.sort((a, b) => a.seq - b.seq);
  const oldest = rows[0]?.seq ?? beforeSeq;
  const hasMore = !!database().prepare('SELECT 1 FROM items WHERE chat_id = ? AND seq < ? LIMIT 1').get(id, oldest);
  return { items: rows, hasMore };
}

export function appendItem(id, { source, item, usage }) {
  if (!SOURCES.has(source)) throw new Error(`非法 source: ${source}`);
  if (!getChat(id)) throw new Error(`对话不存在: ${id}`);
  const conn = database();
  conn.exec('BEGIN IMMEDIATE');
  try {
    const seq = conn.prepare('SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM items WHERE chat_id = ?').get(id).seq;
    const at = new Date().toISOString();
    conn.prepare(`INSERT INTO items(chat_id, seq, source, item, usage, at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, seq, source, JSON.stringify(item), usage ? JSON.stringify(usage) : null, at);
    if (usage) {
      // usage 累计同事务增量维护,和 items 落库天然一致
      conn.prepare(`INSERT INTO chat_usage(chat_id, input, cached, output) VALUES (?, ?, ?, ?)
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
    conn.prepare("UPDATE restart_requests SET status = 'cancelled', completed_at = ? WHERE status = 'pending'").run(now);
    conn.prepare(`INSERT INTO restart_requests(id, summary, reason, status, created_at, target_chat)
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
    FROM restart_requests WHERE id = ?`).get(id) ?? null;
}

export function getPendingRestart() {
  return database().prepare(`SELECT id, summary, reason, status, created_at, confirmed_at, completed_at, instance_id, target_chat
    FROM restart_requests WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1`).get() ?? null;
}

export function confirmRestartRequest(id) {
  const now = new Date().toISOString();
  const result = database().prepare(`UPDATE restart_requests SET status = 'restarting', confirmed_at = ?
    WHERE id = ? AND status = 'pending'`).run(now, id);
  return result.changes ? getRestartRequest(id) : null;
}

export function cancelRestartRequest(id) {
  const now = new Date().toISOString();
  const result = database().prepare(`UPDATE restart_requests SET status = 'cancelled', completed_at = ?
    WHERE id = ? AND status = 'pending'`).run(now, id);
  return result.changes > 0;
}

export function completeRestartRequests(instanceId) {
  const now = new Date().toISOString();
  database().prepare(`UPDATE restart_requests
    SET status = 'succeeded', completed_at = ?, instance_id = ? WHERE status = 'restarting'`)
    .run(now, instanceId);
}
