// 线程:一切消息流的身份。chat 与 task 都是它的一行,只是 kind 不同。
// id 宽度 48 bit(原来是 32 bit):task 的产生频率比 chat 高一两个数量级,
// 窄 id 在几万行量级上冲突概率不可忽略。唯一性最终由本表主键保证。
import crypto from 'node:crypto';
import { database } from '../db/client.js';

export const newId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);

export function createThread({ id = newId(), kind }) {
  const now = new Date().toISOString();
  database().prepare(`INSERT INTO threads(id, kind, context_start, created_at, updated_at)
    VALUES (?, ?, 0, ?, ?)`).run(id, kind, now, now);
  return { id, kind, context_start: 0, created_at: now, updated_at: now };
}

export function getThread(id) {
  return database().prepare(`SELECT id, kind, context_start, created_at, updated_at
    FROM threads WHERE id = ?`).get(id) ?? null;
}

export function touchThread(conn, id, at) {
  conn.prepare('UPDATE threads SET updated_at = ? WHERE id = ?').run(at, id);
}

export function setContextStart(id, value) {
  database().prepare('UPDATE threads SET context_start = ?, updated_at = ? WHERE id = ?')
    .run(value, new Date().toISOString(), id);
  return getThread(id);
}

// 删主干这一行,messages / usage / compactions / chats / tasks 一路级联清干净。
export function removeThread(id) {
  return database().prepare('DELETE FROM threads WHERE id = ?').run(id).changes > 0;
}
