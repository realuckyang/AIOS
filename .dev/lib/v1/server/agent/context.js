export function estimate(items) {
  return Math.ceil(items.reduce((sum, item) => sum + JSON.stringify(item).length, 0) / 3);
}

function clip(text, max) {
  if (text.length <= max) return text;
  const head = Math.floor(max * 0.7);
  return `${text.slice(0, head)}\n\n…（中间省略 ${text.length - max} 字符）…\n\n${text.slice(-(max - head))}`;
}

const compactionItem = (one) => ({ type: 'message', role: 'system', content: one.text });

export function contextTokens(items) {
  let at = items.length - 1;
  while (at >= 0 && !items[at].usage) at -= 1;
  if (at < 0) return estimate(items.map((row) => row.item));
  const usage = items[at].usage;
  const base = usage.total_tokens ?? ((usage.input_tokens ?? 0) + (usage.output_tokens ?? 0));
  return base + estimate(items.slice(at + 1).map((row) => row.item));
}

export function buildContext({ items, compactions, liveResultChars }) {
  const foldPoint = compactions.at(-1)?.endItemId ?? 0;
  const input = compactions.map(compactionItem);
  for (const row of items) {
    if (row.id <= foldPoint) continue;
    const item = row.item;
    input.push(item.type === 'function_call_output' && typeof item.output === 'string'
      ? { ...item, output: clip(item.output, liveResultChars) }
      : item);
  }
  return { input, foldPoint };
}

export function foldable({ items, compactions, keepRecent }) {
  const foldPoint = compactions.at(-1)?.endItemId ?? 0;
  const live = items.filter((row) => row.id > foldPoint);
  let kept = 0;
  let cut = 0;
  for (let i = live.length - 1; i >= 0; i -= 1) {
    kept += estimate([live[i].item]);
    if (kept >= keepRecent) { cut = i; break; }
  }
  if (cut === 0) return [];
  while (cut > 0 && live[cut].item.type !== 'message') cut -= 1;
  return live.slice(0, cut);
}
