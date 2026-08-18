import { bash } from './bash.js';

export const toolOutputItem = (callId, output) => ({
  type: 'function_call_output',
  call_id: callId,
  output: typeof output === 'string' ? output : JSON.stringify(output),
});

export async function runTools(calls, context = {}, onEach = () => {}) {
  const items = [];
  for (const call of calls) {
    if (context.signal?.aborted) throw new Error('已取消');
    let args = {};
    try { args = JSON.parse(call.arguments || '{}'); } catch { args = {}; }
    const output = call.name === 'bash'
      ? await bash(args, context)
      : { error: `没有这个工具：${call.name}` };
    const item = toolOutputItem(call.call_id, output);
    items.push(item);
    onEach(call, item);
  }
  return items;
}
