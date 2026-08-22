// App 调度:持久化在 App,一次 run 的执行交给无状态 Kernel。
import * as store from './store.js';
import * as events from './events.js';
import { buildRunRequest } from './context.js';
import { maintainContext } from './compact.js';
import { getConfig, runOptions, liveCreds } from './config.js';
import { inlineImageRefs } from './files.js';

const running = new Map(); // chatId -> { controller, pending, kernelPort, appPort }

export function isRunning(chatId) { return running.has(chatId); }

async function consumeKernelEvents(res, chatId, maxEventBytes) {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let index;
    while ((index = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      if (Buffer.byteLength(block) > maxEventBytes) throw new Error(`Kernel SSE 事件超过限制: ${maxEventBytes} bytes`);
      let type = '';
      let data = null;
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) type = line.slice(6).trim();
        if (line.startsWith('data:')) {
          try { data = JSON.parse(line.slice(5).trim()); } catch { data = null; }
        }
      }
      if (!data) continue;
      if ((type === 'message' || type === 'reasoning') && data.delta) {
        events.publish(type, { chatId, delta: data.delta });
      } else if (type === 'item' && data.item) {
        const row = store.appendItem(chatId, { source: 'model', item: data.item, usage: data.usage });
        const eventType = data.item.type === 'function_call'
          ? 'tool_calls'
          : (data.item.type === 'reasoning' ? 'reasoning' : 'message');
        events.publish(eventType, { chatId, row });
      } else if (type === 'tool_result' && data.item) {
        const row = store.appendItem(chatId, { source: 'tool', item: data.item });
        events.publish('tool_results', { chatId, row });
      } else if (type === 'error') {
        throw new Error(data.message || 'Kernel run 失败');
      }
    }
    if (Buffer.byteLength(buffer) > maxEventBytes) throw new Error(`Kernel SSE 事件超过限制: ${maxEventBytes} bytes`);
  }
}

async function execute(chatId, entry) {
  const appApiBase = `http://127.0.0.1:${entry.appPort}/api`;
  const config = getConfig();
  // 折叠只能发生在 run 之间:工具循环在 Kernel 内,App 插不进去。
  // 失败就是「这次不折」,不该让 run 挂掉。
  await maintainContext(chatId, { kernelPort: entry.kernelPort, appApiBase, config }).catch((err) => console.warn(`[app] 折叠失败(${chatId}): ${err?.message ?? err}`));

  const meta = store.getChat(chatId);
  if (!meta) return;
  const rows = store.readItems(chatId);
  const request = buildRunRequest({
    meta,
    rows,
    compactions: store.allCompactions(chatId),
    appApiBase,
    userKeepMaxChars: config.compactUserKeepMaxChars,
  });
  // 图片引用留在库里,发模型这一刻才读盘内联成 data URL(远程 API 到不了本地)
  request.input = inlineImageRefs(request.input);
  const res = await fetch(`http://127.0.0.1:${entry.kernelPort}/api/runs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    // 执行参数随 run 下发:改完下一轮就生效,不用重启 Kernel
    body: JSON.stringify({ runId: chatId, options: runOptions(), creds: liveCreds(), ...request }),
    signal: entry.controller.signal,
  });
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `Kernel ${res.status}`);
  await consumeKernelEvents(res, chatId, config.sseEventMaxBytes);
}

export function wake(chatId, { kernelPort, appPort }) {
  const active = running.get(chatId);
  if (active) {
    active.pending = true;
    return;
  }
  if (!store.getChat(chatId)) return;
  const entry = { controller: new AbortController(), pending: false, kernelPort, appPort };
  running.set(chatId, entry);
  events.publish('status', { chatId, status: 'running' });

  (async () => {
    try {
      await execute(chatId, entry);
    } catch (err) {
      if (!entry.controller.signal.aborted) {
        events.publish('error', { chatId, message: String(err?.message ?? err) });
      }
    } finally {
      const rerun = entry.pending && !entry.controller.signal.aborted && !!store.getChat(chatId);
      running.delete(chatId);
      events.publish('done', { chatId });
      events.publish('status', { chatId, status: 'idle' });
      if (rerun) queueMicrotask(() => wake(chatId, { kernelPort, appPort }));
    }
  })();
}

export function stop(chatId) {
  const entry = running.get(chatId);
  if (!entry) return false;
  entry.controller.abort();
  fetch(`http://127.0.0.1:${entry.kernelPort}/api/runs/${encodeURIComponent(chatId)}/stop`, { method: 'POST' }).catch(() => {});
  return true;
}
