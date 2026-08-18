const MESSAGE_ROLES = new Set(['system', 'user', 'assistant', 'developer']);
const MISSING = '这次调用的结果丢了。可能是被中断、超时,或者别的未知原因。';

function narrow(item) {
  if (!item || typeof item !== 'object') return null;
  const kind = item.type ?? (typeof item.role === 'string' ? 'message' : null);

  if (kind === 'message') {
    if (!MESSAGE_ROLES.has(item.role)) return null;
    return { type: 'message', role: item.role, content: item.content };
  }
  if (kind === 'reasoning') {
    const summary = Array.isArray(item.summary) ? item.summary : [];
    const content = Array.isArray(item.content) ? item.content : [];
    return summary.length || content.length ? { type: 'reasoning', summary, content } : null;
  }
  if (kind === 'function_call') {
    if (!item.call_id || !item.name) return null;
    return {
      type: 'function_call',
      call_id: item.call_id,
      name: item.name,
      arguments: typeof item.arguments === 'string' ? item.arguments : JSON.stringify(item.arguments ?? {}),
    };
  }
  if (kind === 'function_call_output') {
    if (!item.call_id) return null;
    return { type: 'function_call_output', call_id: item.call_id, output: String(item.output ?? '') };
  }
  return null;
}

/**
 * 把待发送的 item 收窄到 Responses API 接受的字段，并配齐工具调用结果。
 *
 * 连续的一组 function_call 先全部保留，再逐个补 function_call_output。
 * 有调用但没有结果时补一条明确的丢失说明；没有调用的孤立结果直接丢弃。
 */
export function normalize(items) {
  const clean = [];
  for (const item of items ?? []) {
    const one = narrow(item);
    if (one) clean.push(one);
  }

  const outputs = new Map();
  for (const item of clean) {
    if (item.type === 'function_call_output') outputs.set(item.call_id, item);
  }

  const out = [];
  for (let i = 0; i < clean.length; i += 1) {
    const item = clean[i];
    if (item.type === 'function_call_output') continue;
    if (item.type !== 'function_call') { out.push(item); continue; }

    const group = [];
    while (i < clean.length && clean[i].type === 'function_call') group.push(clean[i++]);
    i -= 1;

    out.push(...group);
    for (const call of group) {
      out.push(outputs.get(call.call_id)
        ?? { type: 'function_call_output', call_id: call.call_id, output: MISSING });
    }
  }
  return out;
}
