// Kernel 只维护正在执行的 run；结束后不保留对话或上下文。
import { runLoop } from './loop.js';

const running = new Map(); // runId -> AbortController

export function isRunning(runId) { return running.has(runId); }

export async function execute({ runId, input, state, config, instructions, emit }) {
  if (running.has(runId)) {
    const err = new Error(`run 已在执行: ${runId}`);
    err.code = 'RUN_CONFLICT';
    throw err;
  }
  const controller = new AbortController();
  running.set(runId, controller);
  try {
    await runLoop({ runId, input, state, config, instructions, signal: controller.signal, emit });
    return controller.signal.aborted ? 'stopped' : 'completed';
  } finally {
    running.delete(runId);
  }
}

export function stop(runId) {
  const controller = running.get(runId);
  if (!controller) return false;
  controller.abort();
  return true;
}

export function stopAll() {
  for (const controller of running.values()) controller.abort();
}
