// 任务线的侧写。压缩、应用调模型、模型自调用都落成 task —— 记账因此没有例外通道。
import { database, transact } from '../db/client.js';
import { newId } from './threads.js';

const SELECT = `SELECT t.id, k.app, k.title, k.mode, k.status, k.response, k.error,
  t.created_at, t.updated_at, k.finished_at,
  COALESCE(u.input, 0) AS usage_input, COALESCE(u.output, 0) AS usage_output,
  COALESCE(u.cost, 0) AS usage_cost, COALESCE(u.currency, '') AS usage_currency
  FROM tasks k JOIN threads t ON t.id = k.id
  LEFT JOIN (SELECT thread_id, SUM(input) AS input, SUM(output) AS output,
             SUM(cost) AS cost, MAX(currency) AS currency
             FROM usage GROUP BY thread_id) u ON u.thread_id = k.id`;

export function createTask({ app, title = '', mode = 'instant' }) {
  if (typeof app !== 'string' || !app.trim()) throw new Error('app 必须是非空字符串');
  if (!['instant', 'agent'].includes(mode)) throw new Error(`mode 非法: ${mode}`);
  const id = newId();
  const now = new Date().toISOString();
  transact((conn) => {
    conn.prepare(`INSERT INTO threads(id, kind, context_start, created_at, updated_at)
      VALUES (?, 'task', 0, ?, ?)`).run(id, now, now);
    conn.prepare(`INSERT INTO tasks(id, app, title, mode, status)
      VALUES (?, ?, ?, ?, 'pending')`).run(id, app.trim(), title, mode);
  });
  return getTask(id);
}

export function getTask(id) {
  return database().prepare(`${SELECT} WHERE k.id = ?`).get(id) ?? null;
}

export function listTasks({ app, limit = 100 } = {}) {
  return app
    ? database().prepare(`${SELECT} WHERE k.app = ? ORDER BY t.created_at DESC LIMIT ?`).all(app, limit)
    : database().prepare(`${SELECT} ORDER BY t.created_at DESC LIMIT ?`).all(limit);
}

export function setTaskStatus(id, status, { response = null, error = null } = {}) {
  const done = ['succeeded', 'failed', 'cancelled'].includes(status);
  database().prepare(`UPDATE tasks SET status = ?, response = COALESCE(?, response),
    error = COALESCE(?, error), finished_at = ? WHERE id = ?`)
    .run(status, response, error, done ? new Date().toISOString() : null, id);
  return getTask(id);
}

export function removeTask(id) {
  return database().prepare('DELETE FROM threads WHERE id = ?').run(id).changes > 0;
}
