import { mapChat } from './chats.js';
import { db, now } from './database.js';

const query = {
  create: db.prepare(`INSERT INTO calls
    (id, chat_id, to_chat_id, request_item_id, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`),
  get: db.prepare('SELECT * FROM calls WHERE id = ?'),
  list: db.prepare('SELECT * FROM calls WHERE chat_id = ? ORDER BY created_at DESC'),
  pendingTo: db.prepare("SELECT * FROM calls WHERE to_chat_id = ? AND status IN ('pending','running') ORDER BY created_at"),
  finish: db.prepare('UPDATE calls SET status = ?, response_item_id = ?, completed_at = ? WHERE id = ?'),
  createdChats: db.prepare(`SELECT DISTINCT c.* FROM chats c
    JOIN calls x ON x.to_chat_id = c.id WHERE x.chat_id = ? AND c.origin = 'call'
    ORDER BY c.updated_at DESC`),
};

const map = (row) => row && ({
  id: row.id, chatId: row.chat_id, toChatId: row.to_chat_id,
  requestItemId: row.request_item_id, responseItemId: row.response_item_id,
  status: row.status, createdAt: row.created_at, completedAt: row.completed_at,
});

export function create({ chatId, toChatId, requestItemId, status = 'running' }) {
  const id = crypto.randomUUID();
  query.create.run(id, chatId, toChatId, requestItemId, status, now());
  return get(id);
}
export const get = (id) => map(query.get.get(id));
export const listByChat = (chatId) => query.list.all(chatId).map(map);
export const pendingTo = (chatId) => query.pendingTo.all(chatId).map(map);
export const finish = (id, status, responseItemId = null) => {
  query.finish.run(status, responseItemId, now(), id); return get(id);
};
export const createdChats = (chatId) => query.createdChats.all(chatId).map(mapChat);
