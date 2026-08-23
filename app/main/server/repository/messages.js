// 消息:全部事实的唯一落点。chat 与 task 共用这一张,靠 thread_id 区分。
import { database, transact } from '../db/client.js';
import { touchThread } from './threads.js';
import { computeCost, accumulate } from './usage.js';

function decode(row) {
  if (!row) return null;
  return {
    seq: row.seq,
    source: row.source,
    item: JSON.parse(row.item),
    at: row.at,
    ...(row.usage ? { usage: JSON.parse(row.usage) } : {}),
    ...(row.model ? { model: row.model } : {}),
    ...(row.cost !== null && row.cost !== undefined ? { cost: row.cost, currency: row.currency } : {}),
  };
}

const COLUMNS = 'seq, source, item, usage, model, cost, currency, at';

export function listMessages(threadId) {
  return database().prepare(`SELECT ${COLUMNS} FROM messages
    WHERE thread_id = ? ORDER BY seq ASC`).all(threadId).map(decode);
}

export function pageMessages(threadId, { before, limit = 60 }) {
  const rows = before
    ? database().prepare(`SELECT ${COLUMNS} FROM messages
        WHERE thread_id = ? AND seq < ? ORDER BY seq DESC LIMIT ?`).all(threadId, before, limit)
    : database().prepare(`SELECT ${COLUMNS} FROM messages
        WHERE thread_id = ? ORDER BY seq DESC LIMIT ?`).all(threadId, limit);
  const items = rows.reverse().map(decode);
  const oldest = items.length ? items[0].seq : (before ?? 0);
  const hasMore = !!database().prepare('SELECT 1 FROM messages WHERE thread_id = ? AND seq < ? LIMIT 1')
    .get(threadId, oldest);
  return { items, hasMore };
}

export function latestSeq(threadId) {
  return database().prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM messages WHERE thread_id = ?')
    .get(threadId).seq;
}

/**
 * 落一条消息。带 usage 时同事务做三件事:写明细、算定成本、累加到 usage 表。
 * 成本用「当时的」单价,并把单价快照一起存下 —— 折算逻辑将来有 bug 还能重算。
 * prices: { input, cached, output, currency }
 */
export function appendMessage(threadId, { source, item, usage, model = '', prices = {} }) {
  return transact((conn) => {
    const seq = conn.prepare('SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM messages WHERE thread_id = ?')
      .get(threadId).seq;
    const at = new Date().toISOString();

    let cost = null;
    let currency = null;
    let counts = null;
    if (usage) {
      counts = {
        input: Number(usage.input_tokens) || 0,
        cached: Number(usage.input_tokens_details?.cached_tokens) || 0,
        output: Number(usage.output_tokens) || 0,
      };
      cost = computeCost(counts, prices);
      currency = String(prices.currency || '');
    }

    conn.prepare(`INSERT INTO messages
      (thread_id, seq, source, item, usage, model, cost, currency, price_in, price_cached, price_out, at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(threadId, seq, source, JSON.stringify(item),
        usage ? JSON.stringify(usage) : null,
        usage ? String(model || '') : null,
        cost, currency,
        usage ? (Number(prices.input) || 0) : null,
        usage ? (Number(prices.cached) || 0) : null,
        usage ? (Number(prices.output) || 0) : null,
        at);

    if (usage) accumulate(conn, threadId, model, { ...counts, cost, currency });
    touchThread(conn, threadId, at);

    return { seq, source, item, at, ...(usage ? { usage, model, cost, currency } : {}) };
  });
}
