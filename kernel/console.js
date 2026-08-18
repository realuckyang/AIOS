// CLI console:正常连接 App 的持久对话；App 不可用时直连 Kernel，
// 并只在本 CLI 进程内存保存临时上下文。它不依赖浏览器或 UI 构建。
import readline from 'node:readline';
import { readSSE } from './utils.js';

function inputItem(text) {
  return { type: 'message', role: 'user', content: [{ type: 'input_text', text }] };
}

function showTool(type, item) {
  if (type === 'tool_calls') {
    let args = {};
    try { args = JSON.parse(item?.arguments || '{}'); } catch { /* 忽略 */ }
    const detail = args.summary || (item?.name === 'bash' ? (args.command || '') : JSON.stringify(args));
    process.stdout.write(`\n[${item?.name || 'tool'}] ${String(detail).split('\n')[0].slice(0, 120)}\n`);
  }
  if (type === 'tool_results') {
    let out = {};
    try { out = JSON.parse(item?.output || '{}'); } catch { /* 忽略 */ }
    process.stdout.write(`[exit ${out.exit_code ?? '?'}]\n`);
  }
}

async function persistentConsole({ base, chat, config }) {
  const api = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  console.log(`[console] App 对话 ${chat.id}${chat.title ? ` · ${chat.title}` : ''}（Ctrl+C 退出；运行中 Ctrl+C 为停止）`);
  let running = false;
  let printed = false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '你> ' });

  (async () => {
    const res = await fetch(`${base}/events`);
    if (!res.ok) throw new Error(await res.text());
    await readSSE(res.body, { maxEventBytes: config.sseEventMaxBytes, onEvent: (type, data) => {
      if (data.chatId !== chat.id) return;
      if (type === 'message' && data.delta) { process.stdout.write(data.delta); printed = true; }
      if (type === 'tool_calls' || type === 'tool_results') showTool(type, data.row?.item);
      if (type === 'error') process.stdout.write(`\n[error] ${data.message}\n`);
      if (type === 'done') {
        running = false;
        process.stdout.write(printed ? '\n\n' : '[本轮无文本输出]\n\n');
        rl.prompt();
      }
    } });
  })().catch((err) => {
    console.error(`\n[console] App 事件流断开：${err.message}`);
    process.exit(1);
  });

  rl.prompt();
  rl.on('line', async (line) => {
    const text = line.trim();
    if (!text) return rl.prompt();
    running = true;
    printed = false;
    try {
      await api('POST', `/chats/${chat.id}/messages`, { content: text, source: 'user' });
    } catch (err) {
      console.error(`[console] 发送失败：${err.message}`);
      running = false;
      rl.prompt();
    }
  });
  rl.on('close', () => process.exit(0));
  rl.on('SIGINT', async () => {
    if (running) {
      await api('POST', `/chats/${chat.id}/stop`).catch(() => {});
      console.log('\n[console] 已停止本轮运行');
      running = false;
      rl.prompt();
    } else {
      rl.close();
    }
  });
}

async function ephemeralConsole({ kernelBase, config }) {
  const runId = `console-${process.pid}`;
  const history = [];
  let controller = null;
  let running = false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '你> ' });

  console.log('[console] App 不可用，已进入 Kernel 临时模式（历史仅存在于当前 CLI 内存）');
  console.log('[console] Ctrl+C 退出；运行中 Ctrl+C 为停止');
  rl.prompt();

  rl.on('line', async (line) => {
    const text = line.trim();
    if (!text) return rl.prompt();
    history.push(inputItem(text));
    controller = new AbortController();
    running = true;
    let printed = false;
    try {
      const res = await fetch(`${kernelBase}/runs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ runId, input: history, state: {} }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(await res.text());
      await readSSE(res.body, { maxEventBytes: config.sseEventMaxBytes, onEvent: (type, data) => {
        if (type === 'message' && data.delta) { process.stdout.write(data.delta); printed = true; }
        if (type === 'item' && data.item) history.push(data.item);
        if (type === 'tool_result' && data.item) history.push(data.item);
        if (type === 'item' && data.item?.type === 'function_call') showTool('tool_calls', data.item);
        if (type === 'tool_result') showTool('tool_results', data.item);
        if (type === 'error') process.stdout.write(`\n[error] ${data.message}\n`);
      } });
    } catch (err) {
      if (err.name !== 'AbortError') console.error(`\n[console] ${err.message}`);
    } finally {
      running = false;
      controller = null;
      process.stdout.write(printed ? '\n\n' : '[本轮无文本输出]\n\n');
      rl.prompt();
    }
  });
  rl.on('close', () => process.exit(0));
  rl.on('SIGINT', async () => {
    if (running) {
      controller?.abort();
      await fetch(`${kernelBase}/runs/${encodeURIComponent(runId)}/stop`, { method: 'POST' }).catch(() => {});
      console.log('\n[console] 已停止本轮运行');
    } else {
      rl.close();
    }
  });
}

export async function runConsole({ config, chatId }) {
  const appBase = `http://127.0.0.1:${config.appPort}/api`;
  try {
    const path = chatId ? `/chats/${chatId}` : '/chats';
    const res = await fetch(appBase + path, {
      method: chatId ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: chatId ? undefined : JSON.stringify({ title: `console ${new Date().toISOString().slice(0, 16)}` }),
      signal: AbortSignal.timeout(config.consoleConnectTimeoutMs),
    });
    if (!res.ok) throw new Error(await res.text());
    return persistentConsole({ base: appBase, chat: await res.json(), config });
  } catch (err) {
    console.error(`[console] 无法连接 App(${appBase})：${err.message}`);
    return ephemeralConsole({ kernelBase: `http://127.0.0.1:${config.kernelPort}/api`, config });
  }
}
