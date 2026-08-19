// input 组装:上下文指针之后取 items + 注入水位状态行。这是内核的全部「内存管理」。
// 遗忘 = 拨 meta.context_start;压缩策略在 userland。

function normalize(rows) {
  // 剥掉行信封,轻度清理,配对工具调用:孤儿 function_call / function_call_output 会让请求失败,丢弃。
  const items = rows.map((row) => row.item);
  const outputIds = new Set(items.filter((i) => i?.type === 'function_call_output').map((i) => i.call_id));
  const callIds = new Set(items.filter((i) => i?.type === 'function_call').map((i) => i.call_id));
  return items
    .filter((i) => i && typeof i === 'object')
    .filter((i) => !(i.type === 'function_call' && !outputIds.has(i.call_id)))
    .filter((i) => !(i.type === 'function_call_output' && !callIds.has(i.call_id)))
    .map(({ status, ...item }) => item);
}

export function buildInput({ meta, rows, apiBase }) {
  const visible = rows.filter((row) => row.seq > (meta.context_start || 0));
  const lastUsage = [...rows].reverse().find((row) => row.usage)?.usage;
  const tokens = lastUsage
    ? `input=${lastUsage.input_tokens ?? '?'} output=${lastUsage.output_tokens ?? '?'}`
    : '无(尚无模型请求)';
  const state = [
    `[kernel 状态行] chat=${meta.id}`,
    `最新 seq=${rows.length ? rows[rows.length - 1].seq : 0}`,
    `context_start=${meta.context_start || 0}(此前的 items 不在你的上下文中)`,
    `上次请求 token 用量: ${tokens}`,
    `内核 API: ${apiBase}`,
    `现在: ${new Date().toISOString()}`,
  ].join(' · ');

  return [
    ...normalize(visible),
    { type: 'message', role: 'system', content: [{ type: 'input_text', text: state }] },
  ];
}
