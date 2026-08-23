// 用量聚合。成本一律取 messages 里落库时算定的值,不再按现价重算 ——
// 所以改单价不会让历史金额跳动,换模型也不会让旧 token 被按新价折算。
import * as usage from '../repository/usage.js';

const num = (row, field) => Number(row[field]) || 0;

// 时间桶:按本地时的「小时」或「日」切分。bucket 可排序,label 直接显示。
function bucketOf(at, granularity) {
  const d = new Date(at);
  const p = (n) => String(n).padStart(2, '0');
  if (granularity === 'hour') {
    return {
      bucket: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00:00`,
      label: `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:00`,
    };
  }
  return {
    bucket: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T00:00:00`,
    label: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
  };
}

const currencyOf = (rows, fallback) =>
  rows.find((r) => r.currency)?.currency || fallback || '';

export function overview(fallbackCurrency) {
  const rows = usage.rows();
  let input = 0, output = 0, cached = 0, cost = 0;
  for (const r of rows) {
    input += num(r, 'input_tokens');
    output += num(r, 'output_tokens');
    cached += num(r, 'cached_tokens');
    cost += num(r, 'cost');
  }
  return {
    input, output, cached, cost,
    currency: currencyOf(rows, fallbackCurrency),
    requests: rows.length,
    from: rows[0]?.at ?? null,
    to: rows[rows.length - 1]?.at ?? null,
  };
}

export function trend(granularity = 'day', fallbackCurrency) {
  const rows = usage.rows();
  const buckets = new Map();
  for (const r of rows) {
    const { bucket, label } = bucketOf(r.at, granularity);
    let b = buckets.get(bucket);
    if (!b) { b = { bucket, label, input: 0, output: 0, cached: 0, cost: 0, requests: 0 }; buckets.set(bucket, b); }
    b.input += num(r, 'input_tokens');
    b.output += num(r, 'output_tokens');
    b.cached += num(r, 'cached_tokens');
    b.cost += num(r, 'cost');
    b.requests += 1;
  }
  return {
    granularity,
    currency: currencyOf(rows, fallbackCurrency),
    points: [...buckets.values()].sort((a, b) => a.bucket.localeCompare(b.bucket)),
  };
}

// 两条线一起列:chat 与 task 都在 threads 上,压缩这类消耗从此可见。
export function byThread(fallbackCurrency) {
  const rows = usage.rows();
  const map = new Map();
  for (const r of rows) {
    let t = map.get(r.thread_id);
    if (!t) {
      t = { id: r.thread_id, kind: r.kind, title: r.title, app: r.app,
            input: 0, output: 0, cached: 0, cost: 0, requests: 0, at: r.at };
      map.set(r.thread_id, t);
    }
    t.input += num(r, 'input_tokens');
    t.output += num(r, 'output_tokens');
    t.cached += num(r, 'cached_tokens');
    t.cost += num(r, 'cost');
    t.requests += 1;
    if (r.at > t.at) t.at = r.at;
  }
  return {
    currency: currencyOf(rows, fallbackCurrency),
    threads: [...map.values()].sort((a, b) => b.at.localeCompare(a.at)),
  };
}

// 按模型拆:换过模型之后,各自花了多少一目了然。
export function byModel(fallbackCurrency) {
  const list = usage.byModel();
  return { currency: list.find((r) => r.currency)?.currency || fallbackCurrency || '', models: list };
}
