import { db, now } from './database.js';

const query = {
  add: db.prepare(`INSERT INTO compactions
    (chat_id, start_item_id, end_item_id, text, created_at) VALUES (?, ?, ?, ?, ?)`),
  list: db.prepare('SELECT * FROM compactions WHERE chat_id = ? ORDER BY id'),
  get: db.prepare('SELECT * FROM compactions WHERE id = ?'),
};

const map = (row) => row && ({
  id: Number(row.id), chatId: row.chat_id, startItemId: row.start_item_id,
  endItemId: row.end_item_id, text: row.text, createdAt: row.created_at,
});

export function add(chatId, one) {
  const info = query.add.run(chatId, one.startItemId, one.endItemId, one.text, now());
  return map(query.get.get(Number(info.lastInsertRowid)));
}
export const listByChat = (chatId) => query.list.all(chatId).map(map);
