// 待办的事实。库在 var/apps/todo.db —— 和框架库完全无关。
import { createAppDb } from '../../_shared/db.js';
import crypto from 'node:crypto';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS todos (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  done       INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);`;

const db = () => createAppDb('todo', SCHEMA);
const decode = (row) => (row ? { ...row, done: !!row.done } : null);
const COLUMNS = 'id, title, done, created_at, updated_at';

export function listTodos() {
  // 未完成按创建倒序(新的在上),已完成按最近完成在前;分组由界面做
  return db().prepare(`SELECT ${COLUMNS} FROM todos
    ORDER BY done ASC, CASE WHEN done THEN updated_at ELSE created_at END DESC`).all().map(decode);
}

export function createTodo(title) {
  const id = crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  db().prepare('INSERT INTO todos(id, title, done, created_at, updated_at) VALUES (?, ?, 0, ?, ?)')
    .run(id, title, now, now);
  return decode(db().prepare(`SELECT ${COLUMNS} FROM todos WHERE id = ?`).get(id));
}

export function updateTodo(id, changes) {
  const current = db().prepare('SELECT id, title, done FROM todos WHERE id = ?').get(id);
  if (!current) return null;
  const title = changes.title !== undefined ? changes.title : current.title;
  const done = changes.done !== undefined ? (changes.done ? 1 : 0) : current.done;
  db().prepare('UPDATE todos SET title = ?, done = ?, updated_at = ? WHERE id = ?')
    .run(title, done, new Date().toISOString(), id);
  return decode(db().prepare(`SELECT ${COLUMNS} FROM todos WHERE id = ?`).get(id));
}

export function removeTodo(id) {
  return db().prepare('DELETE FROM todos WHERE id = ?').run(id).changes > 0;
}

export function clearDoneTodos() {
  return db().prepare('DELETE FROM todos WHERE done = 1').run().changes;
}
