import { db, now } from './database.js';

const query = {
  create: db.prepare(`INSERT INTO chats
    (id, title, description, origin, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`),
  get: db.prepare('SELECT * FROM chats WHERE id = ?'),
  listAll: db.prepare('SELECT * FROM chats ORDER BY updated_at DESC LIMIT ?'),
  listOrigin: db.prepare('SELECT * FROM chats WHERE origin = ? ORDER BY updated_at DESC LIMIT ?'),
  update: db.prepare(`UPDATE chats SET
    title = COALESCE(?, title), description = COALESCE(?, description), updated_at = ? WHERE id = ?`),
  status: db.prepare('UPDATE chats SET status = ?, updated_at = ? WHERE id = ?'),
  touch: db.prepare('UPDATE chats SET updated_at = ? WHERE id = ?'),
  remove: db.prepare('DELETE FROM chats WHERE id = ?'),
  resetRunning: db.prepare("UPDATE chats SET status = 'idle' WHERE status = 'running'"),
};

export const mapChat = (row) => row && ({
  id: row.id,
  title: row.title,
  description: row.description,
  origin: row.origin,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function create({ title = '', description = '', origin = 'user', status = 'idle' } = {}) {
  const id = crypto.randomUUID();
  const at = now();
  query.create.run(id, title, description, origin, status, at, at);
  return get(id);
}

export const get = (id) => mapChat(query.get.get(id));
export const list = ({ origin, limit = 100 } = {}) => (
  origin ? query.listOrigin.all(origin, limit).map(mapChat) : query.listAll.all(limit).map(mapChat)
);
export const update = (id, changes = {}) => {
  query.update.run(changes.title ?? null, changes.description ?? null, now(), id);
  return get(id);
};
export const updateStatus = (id, status) => { query.status.run(status, now(), id); return get(id); };
export const touch = (id) => query.touch.run(now(), id);
export const remove = (id) => query.remove.run(id);
export const resetRunning = () => query.resetRunning.run();
