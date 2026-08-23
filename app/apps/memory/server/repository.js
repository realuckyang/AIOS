// 记忆的事实。库在 var/apps/memory.db。
import { createAppDb } from '../../_shared/db.js';
import crypto from 'node:crypto';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS memories (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  tags       TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags)),
  pinned     INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
  source     TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'agent', 'runtime')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS memories_updated ON memories(updated_at DESC);`;

const db = () => createAppDb('memory', SCHEMA);
const COLUMNS = 'id, title, body, tags, pinned, source, created_at, updated_at';

const decode = (row) => {
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
  if (tag) {
    return db().prepare(`SELECT ${COLUMNS} FROM memories
      WHERE EXISTS (SELECT 1 FROM json_each(memories.tags) WHERE json_each.value = ?)
      ORDER BY pinned DESC, updated_at DESC`).all(tag).map(decode);
  }
  return db().prepare(`SELECT ${COLUMNS} FROM memories
    ORDER BY pinned DESC, updated_at DESC`).all().map(decode);
}

export function getMemory(id) {
  return decode(db().prepare(`SELECT ${COLUMNS} FROM memories WHERE id = ?`).get(id));
}

export function createMemory({ title, body = '', tags = [], source = 'manual' }) {
  if (typeof title !== 'string' || !title.trim()) throw new Error('title 必须是非空字符串');
  if (typeof body !== 'string') throw new Error('body 必须是字符串');
  const id = crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  db().prepare(`INSERT INTO memories(id, title, body, tags, pinned, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, ?, ?, ?)`)
    .run(id, title.trim(), body, JSON.stringify(normalizeTags(tags)), source, now, now);
  return getMemory(id);
}

export function updateMemory(id, changes) {
  const current = getMemory(id);
  if (!current) return null;
  const title = changes.title !== undefined
    ? (typeof changes.title === 'string' && changes.title.trim() ? changes.title.trim() : '')
    : current.title;
  const body = changes.body !== undefined ? (typeof changes.body === 'string' ? changes.body : '') : current.body;
  const tags = changes.tags !== undefined ? normalizeTags(changes.tags) : current.tags;
  const pinned = changes.pinned !== undefined ? (changes.pinned ? 1 : 0) : (current.pinned ? 1 : 0);
  if (!title) throw new Error('title 必须是非空字符串');
  db().prepare('UPDATE memories SET title = ?, body = ?, tags = ?, pinned = ?, updated_at = ? WHERE id = ?')
    .run(title, body, JSON.stringify(tags), pinned, new Date().toISOString(), id);
  return getMemory(id);
}

export function removeMemory(id) {
  return db().prepare('DELETE FROM memories WHERE id = ?').run(id).changes > 0;
}

export function memoryTags() {
  return db().prepare(`SELECT json_each.value AS tag, COUNT(*) AS count
    FROM memories, json_each(memories.tags)
    GROUP BY json_each.value ORDER BY count DESC, tag ASC`).all();
}
