import { contextTokens, foldable } from './context.js';
import { stream } from '../llm/index.js';

export async function compact({ items, compactions, signal, context, llm, prompt }) {
  if (contextTokens(items) <= context.window - context.reserve) return false;
  const rows = foldable({ items, compactions, keepRecent: context.keepRecent });
  if (!rows.length) return false;
  const material = rows.map((row) => JSON.stringify(row.item)).join('\n');
  const result = await stream({
    instructions: prompt,
    input: [{ type: 'message', role: 'user', content: material }],
    signal,
    config: llm,
  });
  const text = String(result.text ?? '').trim();
  return text ? { startItemId: rows[0].id, endItemId: rows.at(-1).id, text } : false;
}
