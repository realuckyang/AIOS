// 调度:消息即运行。running 状态只存在于本进程内存——重启即空,不存在恢复。
import { runLoop } from './loop.js';
import { publish } from './events.js';
import * as store from './store.js';

const running = new Map(); // chatId -> AbortController

export function isRunning(chatId) {
  return running.has(chatId);
}

export function wake(chatId, { config, instructions }) {
  if (running.has(chatId)) return;
  if (!store.getChat(chatId)) return;
  const controller = new AbortController();
  running.set(chatId, controller);
  publish('status', { chatId, status: 'running' });

  (async () => {
    try {
      await runLoop({ chatId, config, instructions, signal: controller.signal, emit: publish });
    } catch (err) {
      if (!controller.signal.aborted) {
        publish('error', { chatId, message: String(err?.message ?? err) });
      }
    } finally {
      running.delete(chatId);
      publish('done', { chatId });
      publish('status', { chatId, status: 'idle' });
    }
  })();
}

export function stop(chatId) {
  const controller = running.get(chatId);
  if (!controller) return false;
  controller.abort();
  return true;
}
