// 对话线的侧写。一个 chat = threads 里一行(kind='chat') + 这里一行。
import { database, transact } from '../db/client.js';
import { newId } from './threads.js';

// 累计从 usage 表来(每模型一行,这里求和);读取 O(1) 量级。
const SELECT = `SELECT t.id, c.title, c.description, t.context_start, c.pinned_at,
  t.created_at, t.updated_at,
  COALESCE(u.input, 0) AS usage_input, COALESCE(u.cached, 0) AS usage_cached,
  COALESCE(u.output, 0) AS usage_output, COALESCE(u.cost, 0) AS usage_cost,
  COALESCE(u.currency, '') AS usage_currency
  FROM chats c JOIN threads t ON t.id = c.id
  LEFT JOIN (SELECT thread_id, SUM(input) AS input, SUM(cached) AS cached,
             SUM(output) AS output, SUM(cost) AS cost, MAX(currency) AS currency
             FROM usage GROUP BY thread_id) u ON u.thread_id = c.id`;

export function createChat({ title = '', description = '' } = {}) {
  const id = newId();
  const now = new Date().toISOString();
  transact((conn) => {
    conn.prepare(`INSERT INTO threads(id, kind, context_start, created_at, updated_at)
      VALUES (?, 'chat', 0, ?, ?)`).run(id, now, now);
    conn.prepare('INSERT INTO chats(id, title, description) VALUES (?, ?, ?)')
      .run(id, title, description);
  });
  return getChat(id);
}

export function getChat(id) {
  return database().prepare(`${SELECT} WHERE c.id = ?`).get(id) ?? null;
}

export function listChats() {
  return database().prepare(`${SELECT} ORDER BY t.updated_at DESC`).all();
}

export function updateChat(id, changes) {
  const current = getChat(id);
  if (!current) return null;
  const title = changes.title !== undefined ? changes.title : current.title;
  const description = changes.description !== undefined ? changes.description : current.description;
  const contextStart = changes.context_start !== undefined ? changes.context_start : current.context_start;
  const pinnedAt = changes.pinned !== undefined
    ? (changes.pinned ? (current.pinned_at ?? new Date().toISOString()) : null)
    : current.pinned_at;
  const touched = changes.title !== undefined || changes.description !== undefined
    || changes.context_start !== undefined;
  const now = new Date().toISOString();
  transact((conn) => {
    conn.prepare('UPDATE chats SET title = ?, description = ?, pinned_at = ? WHERE id = ?')
      .run(title, description, pinnedAt, id);
    conn.prepare('UPDATE threads SET context_start = ?, updated_at = ? WHERE id = ?')
      .run(contextStart, touched ? now : current.updated_at, id);
  });
  return getChat(id);
}

// 删主干那一行即可:chats / messages / usage / compactions 全靠外键级联。
export function removeChat(id) {
  return database().prepare('DELETE FROM threads WHERE id = ?').run(id).changes > 0;
}
