// 任务:一切非用户发起的模型请求都走这里。
//
// 压缩摘要是第一个使用者,将来应用调模型、模型自调用走同一条路。
// 关键不在于「多了一种任务」,而在于**没有第二条通往模型的路**:
// 每个 task 开一个 thread、消息落 messages、用量进 usage —— 于是
// 「花了钱但账上看不见」在结构上不可能发生。老版的压缩消耗就漏在这儿。
import * as tasks from '../repository/tasks.js';
import * as messages from '../repository/messages.js';
import * as run from './run.js';
import { liveCreds, pricing } from '../config.js';

const userItem = (text) => ({
  type: 'message', role: 'user', content: [{ type: 'input_text', text: String(text ?? '') }],
});

const outputText = (items = []) => items
  .filter((item) => item?.type === 'message')
  .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
  .map((part) => (typeof part?.text === 'string' ? part.text : ''))
  .join('')
  .trim();

/**
 * 一次性补全:不进工具循环,不带历史。同步返回结果。
 * 消耗照样落库 —— 这是它和老版 /api/complete 直连的唯一但关键的差别。
 */
export async function runInstant({ app, title = '', prompt, instructions = '', timeoutMs = 90_000, kernelPort }) {
  const task = tasks.createTask({ app, title, mode: 'instant' });
  const price = pricing();
  messages.appendMessage(task.id, { source: 'runtime', item: userItem(prompt) });
  tasks.setTaskStatus(task.id, 'running');

  try {
    const res = await fetch(`http://127.0.0.1:${kernelPort}/api/complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: price.model, instructions, input: [userItem(prompt)], creds: liveCreds() }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error((await res.text().catch(() => '')) || `Kernel ${res.status}`);
    const data = await res.json();
    const text = typeof data.text === 'string' ? data.text : outputText(data.items);

    messages.appendMessage(task.id, {
      source: 'model',
      item: { type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] },
      usage: data.usage ?? null,
      model: price.model,
      prices: price,
    });
    tasks.setTaskStatus(task.id, 'succeeded', { response: text });
    return { id: task.id, text, usage: data.usage ?? null };
  } catch (err) {
    tasks.setTaskStatus(task.id, 'failed', { error: String(err?.message ?? err) });
    throw err;
  }
}

/**
 * agent 循环:走和对话完全相同的 run 通道,只是线程 kind 是 task。
 * wait=false 时立即返回任务 id,结果之后从 /api/tasks/<id> 取。
 */
export async function runAgent({ app, title = '', prompt, wait = true, kernelPort, appPort }) {
  const task = tasks.createTask({ app, title, mode: 'agent' });
  messages.appendMessage(task.id, { source: 'runtime', item: userItem(prompt) });
  tasks.setTaskStatus(task.id, 'running');
  run.wake(task.id, { kernelPort, appPort });

  if (!wait) return { id: task.id, status: 'running' };

  await run.waitIdle(task.id);
  const rows = messages.listMessages(task.id);
  const text = outputText(rows.filter((row) => row.source === 'model').map((row) => row.item));
  tasks.setTaskStatus(task.id, 'succeeded', { response: text });
  return { id: task.id, text };
}
