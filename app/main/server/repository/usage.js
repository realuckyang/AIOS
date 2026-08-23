// 记账。成本在消息落库那一刻按当时单价算定并写死,不再每次渲染按现价重算。
import { database } from '../db/client.js';

// input 里命中缓存的部分按缓存价,其余按输入价;输出按输出价。
// priceCached 为 0 表示「不打折,按输入价算」。
export function computeCost({ input = 0, cached = 0, output = 0 }, prices = {}) {
  const pin = Number(prices.input) || 0;
  const pout = Number(prices.output) || 0;
  const pc = Number(prices.cached) > 0 ? Number(prices.cached) : pin;
  const hit = Math.min(cached, input);
  return ((input - hit) / 1e6) * pin + (hit / 1e6) * pc + (output / 1e6) * pout;
}

// 与 messages 落库同事务调用,所以累计与明细天然一致。
export function accumulate(conn, threadId, model, { input, cached, output, cost, currency }) {
  conn.prepare(`INSERT INTO usage(thread_id, model, input, cached, output, cost, currency)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(thread_id, model) DO UPDATE SET
      input = input + excluded.input, cached = cached + excluded.cached,
      output = output + excluded.output, cost = cost + excluded.cost,
      currency = excluded.currency`)
    .run(threadId, model || '', input, cached, output, cost, currency || '');
}

// 一个线程的合计(跨模型)。
export function threadTotals(threadId) {
  return database().prepare(`SELECT
    COALESCE(SUM(input), 0) AS input, COALESCE(SUM(cached), 0) AS cached,
    COALESCE(SUM(output), 0) AS output, COALESCE(SUM(cost), 0) AS cost,
    COALESCE(MAX(currency), '') AS currency
    FROM usage WHERE thread_id = ?`).get(threadId);
}

// 按模型拆开,用量应用要用。
export function byModel() {
  return database().prepare(`SELECT model,
    SUM(input) AS input, SUM(cached) AS cached, SUM(output) AS output,
    SUM(cost) AS cost, MAX(currency) AS currency
    FROM usage GROUP BY model ORDER BY cost DESC`).all();
}

// 按线程拆开,带上标题(chat)或应用名(task)—— 一次 join 拿全两条线。
export function byThread() {
  return database().prepare(`SELECT u.thread_id, t.kind,
    COALESCE(c.title, tk.title, '') AS title,
    COALESCE(tk.app, '') AS app,
    SUM(u.input) AS input, SUM(u.cached) AS cached, SUM(u.output) AS output,
    SUM(u.cost) AS cost, MAX(u.currency) AS currency, MAX(t.updated_at) AS at
    FROM usage u
    JOIN threads t ON t.id = u.thread_id
    LEFT JOIN chats c ON c.id = u.thread_id
    LEFT JOIN tasks tk ON tk.id = u.thread_id
    GROUP BY u.thread_id ORDER BY cost DESC`).all();
}

// 明细行,按时间桶聚合时用。带 usage 的 message 行就是计费口径。
export function rows() {
  return database().prepare(`SELECT m.thread_id, t.kind, m.at, m.model, m.cost, m.currency,
    COALESCE(c.title, tk.title, '') AS title, COALESCE(tk.app, '') AS app,
    json_extract(m.usage, '$.input_tokens') AS input_tokens,
    json_extract(m.usage, '$.output_tokens') AS output_tokens,
    json_extract(m.usage, '$.input_tokens_details.cached_tokens') AS cached_tokens
    FROM messages m
    JOIN threads t ON t.id = m.thread_id
    LEFT JOIN chats c ON c.id = m.thread_id
    LEFT JOIN tasks tk ON tk.id = m.thread_id
    WHERE m.usage IS NOT NULL ORDER BY m.at ASC`).all();
}
