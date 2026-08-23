// App 与 Boot 之间的重启握手记录。不属于消息流,只是同库存放。
import crypto from 'node:crypto';
import { database, transact } from '../db/client.js';

const COLUMNS = 'id, summary, reason, status, created_at, confirmed_at, completed_at, instance_id, target_chat';

export function createRestartRequest({ summary, reason = '', target_chat = null }) {
  if (typeof summary !== 'string' || !summary.trim()) throw new Error('summary 必须是非空字符串');
  if (typeof reason !== 'string') throw new Error('reason 必须是字符串');
  if (target_chat !== null && typeof target_chat !== 'string') throw new Error('target_chat 必须是字符串或 null');
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  transact((conn) => {
    conn.prepare("UPDATE restarts SET status = 'cancelled', completed_at = ? WHERE status = 'pending'").run(now);
    conn.prepare(`INSERT INTO restarts(id, summary, reason, status, created_at, target_chat)
      VALUES (?, ?, ?, 'pending', ?, ?)`).run(id, summary.trim(), reason, now, target_chat);
  });
  return getRestartRequest(id);
}

export function getRestartRequest(id) {
  return database().prepare(`SELECT ${COLUMNS} FROM restarts WHERE id = ?`).get(id) ?? null;
}

export function getPendingRestart() {
  return database().prepare(`SELECT ${COLUMNS} FROM restarts
    WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1`).get() ?? null;
}

export function confirmRestartRequest(id) {
  const result = database().prepare(`UPDATE restarts SET status = 'restarting', confirmed_at = ?
    WHERE id = ? AND status = 'pending'`).run(new Date().toISOString(), id);
  return result.changes ? getRestartRequest(id) : null;
}

export function cancelRestartRequest(id) {
  const result = database().prepare(`UPDATE restarts SET status = 'cancelled', completed_at = ?
    WHERE id = ? AND status = 'pending'`).run(new Date().toISOString(), id);
  return result.changes > 0;
}

export function completeRestartRequests(instanceId) {
  database().prepare(`UPDATE restarts SET status = 'succeeded', completed_at = ?, instance_id = ?
    WHERE status = 'restarting'`).run(new Date().toISOString(), instanceId);
}
