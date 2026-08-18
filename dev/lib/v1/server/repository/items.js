import * as chats from './chats.js';
import { db, now } from './database.js';

const SOURCES = new Set(['user', 'model', 'tool', 'runtime']);

const query = {
  add: db.prepare('INSERT INTO items (chat_id, item, source, usage, created_at) VALUES (?, ?, ?, ?, ?)'),
  list: db.prepare('SELECT * FROM items WHERE chat_id = ? ORDER BY id'),
  after: db.prepare('SELECT * FROM items WHERE chat_id = ? AND id > ? ORDER BY id LIMIT ?'),
  before: db.prepare('SELECT * FROM items WHERE chat_id = ? AND id < ? ORDER BY id DESC LIMIT ?'),
  get: db.prepare('SELECT * FROM items WHERE id = ?'),
};

const map = (row) => row && ({
  id: Number(row.id),
  chatId: row.chat_id,
  item: JSON.parse(row.item),
  source: row.source,
  usage: row.usage ? JSON.parse(row.usage) : null,
  createdAt: row.created_at,
});

export function add(chatId, item, { source, usage = null } = {}) {
  if (!SOURCES.has(source)) throw new Error(`无效 item source：${source ?? '(缺失)'}`);
  const info = query.add.run(
    chatId, JSON.stringify(item), source, usage ? JSON.stringify(usage) : null, now(),
  );
  chats.touch(chatId);
  return get(Number(info.lastInsertRowid));
}

export const get = (id) => map(query.get.get(id));
export function listByChat(chatId, { after, before, limit = 500 } = {}) {
  if (after) return query.after.all(chatId, after, limit).map(map);
  if (before) return query.before.all(chatId, before, limit).reverse().map(map);
  return query.list.all(chatId).map(map);
}
