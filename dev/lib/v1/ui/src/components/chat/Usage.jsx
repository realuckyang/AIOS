// 与后端 settings 默认 context.window 保持一致；如修改过窗口大小，这里的比例仅作近似。
const CONTEXT_WINDOW = 1048576;

export function Usage({ items }) {
  let cost = 0; let input = 0; let output = 0;
  for (const row of items) if (row.usage) {
    cost += row.usage.cost ?? 0; input += row.usage.input_tokens ?? 0; output += row.usage.output_tokens ?? 0;
  }
  const tokens = input + output;
  const pct = Math.min(100, Math.round((tokens / CONTEXT_WINDOW) * 100));
  return (
    <span className="usage">
      {cost > 0 ? `$${cost.toFixed(4)} · ` : ''}
      {tokens > 0 ? `${tokens.toLocaleString()} tokens` : ''}
      {tokens > 0 && <span className="context-meter"><i style={{ width: `${pct}%` }} /></span>}
      {tokens > 0 ? `${pct}%` : ''}
    </span>
  );
}
