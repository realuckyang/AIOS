// App 调度:持久化在 App,一次 run 的执行交给无状态 Kernel。
// 以 thread 为单位 —— chat 与 task 走同一条路,记账因此没有例外通道。
import * as messages from '../repository/messages.js';
import * as threads from '../repository/threads.js';
import * as compactions from '../repository/compactions.js';
import * as events from '../events.js';
import { buildRunRequest } from './context.js';
import { maintainContext } from './compact.js';
import { getConfig, runOptions, liveCreds, pricing } from '../config.js';
import { inlineImageRefs } from '../files.js';

const running = new Map(); // threadId -> { controller, pending, kernelPort, appPort }

export function isRunning(threadId) { return running.has(threadId); }

async function consumeKernelEvents(res, threadId, maxEventBytes) {
  const decoder = new TextDecoder();
  const price = pricing();
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
        events.publish(type, { threadId, delta: data.delta });
      } else if (type === 'item' && data.item) {
        const row = messages.appendMessage(threadId, {
          source: 'model', item: data.item, usage: data.usage,
          model: price.model, prices: price,
        });
        const eventType = data.item.type === 'function_call'
          ? 'tool_calls'
          : (data.item.type === 'reasoning' ? 'reasoning' : 'message');
        events.publish(eventType, { threadId, row });
      } else if (type === 'tool_result' && data.item) {
        const row = messages.appendMessage(threadId, { source: 'tool', item: data.item });
        events.publish('tool_results', { threadId, row });
      } else if (type === 'error') {
        throw new Error(data.message || 'Kernel run 失败');
      }
    }
    if (Buffer.byteLength(buffer) > maxEventBytes) throw new Error(`Kernel SSE 事件超过限制: ${maxEventBytes} bytes`);
  }
}

async function execute(threadId, entry) {
  const appApiBase = `http://127.0.0.1:${entry.appPort}/api`;
  const config = getConfig();
  // 折叠只能发生在 run 之间:工具循环在 Kernel 内,App 插不进去。
  // 失败就是「这次不折」,不该让 run 挂掉。
  await maintainContext(threadId, { kernelPort: entry.kernelPort, appApiBase, config })
    .catch((err) => console.warn(`[app] 折叠失败(${threadId}): ${err?.message ?? err}`));

  const meta = threads.getThread(threadId);
  if (!meta) return;
  const rows = messages.listMessages(threadId);
  const request = buildRunRequest({
    meta,
    rows,
    compactions: compactions.allCompactions(threadId),
    appApiBase,
    userKeepMaxChars: config.compactUserKeepMaxChars,
  });
  // 图片引用留在库里,发模型这一刻才读盘内联成 data URL(远程 API 到不了本地)
  request.input = inlineImageRefs(request.input);
  const res = await fetch(`http://127.0.0.1:${entry.kernelPort}/api/runs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    // 执行参数随 run 下发:改完下一轮就生效,不用重启 Kernel
    body: JSON.stringify({ runId: threadId, options: runOptions(), creds: liveCreds(), ...request }),
    signal: entry.controller.signal,
  });
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `Kernel ${res.status}`);
  await consumeKernelEvents(res, threadId, config.sseEventMaxBytes);
}

export function wake(threadId, { kernelPort, appPort }) {
  const active = running.get(threadId);
  if (active) {
    active.pending = true;
    return;
  }
  if (!threads.getThread(threadId)) return;
  const entry = { controller: new AbortController(), pending: false, kernelPort, appPort };
  running.set(threadId, entry);
  events.publish('status', { threadId, status: 'running' });

  (async () => {
    try {
      await execute(threadId, entry);
    } catch (err) {
      if (!entry.controller.signal.aborted) {
        events.publish('error', { threadId, message: String(err?.message ?? err) });
      }
    } finally {
      const rerun = entry.pending && !entry.controller.signal.aborted && !!threads.getThread(threadId);
      running.delete(threadId);
      events.publish('done', { threadId });
      events.publish('status', { threadId, status: 'idle' });
      if (rerun) queueMicrotask(() => wake(threadId, { kernelPort, appPort }));
    }
  })();
}

/** 等这个线程当前这一轮跑完(task 的同步模式要用)。 */
export function waitIdle(threadId) {
  return new Promise((resolve) => {
    if (!running.has(threadId)) return resolve();
    const timer = setInterval(() => {
      if (!running.has(threadId)) { clearInterval(timer); resolve(); }
    }, 50);
  });
}

export function stop(threadId) {
  const entry = running.get(threadId);
  if (!entry) return false;
  entry.controller.abort();
  fetch(`http://127.0.0.1:${entry.kernelPort}/api/runs/${encodeURIComponent(threadId)}/stop`, { method: 'POST' }).catch(() => {});
  return true;
}
