// CLI console:tty 逃生通道。一行进、流式答案出。
// 它是内核 API 的客户端,不直写文件——单写者与人机平权无损。
// 美德就是简陋:简陋意味着永远不会坏。
import readline from 'node:readline';

export async function runConsole({ config, chatId }) {
  const base = `http://127.0.0.1:${config.kernelPort}/api`;

  const api = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  // 附着或新建对话
  let chat;
  try {
    chat = chatId
      ? await api('GET', `/chats/${chatId}`)
      : await api('POST', '/chats', { title: `console ${new Date().toISOString().slice(0, 16)}` });
  } catch (err) {
    console.error(`无法连接内核(${base}):${err.message}`);
    console.error('先启动内核:node kernel/index.js');
    process.exit(1);
  }
  console.log(`[console] 对话 ${chat.id}${chat.title ? ` · ${chat.title}` : ''}(Ctrl+C 退出;运行中 Ctrl+C 为停止)`);

  let running = false;
  let printedThisRun = false;

  // 一条 SSE 连接,只看本对话
  (async () => {
    const res = await fetch(`${base}/events`);
    const decoder = new TextDecoder();
    let buffer = '';
    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk, { stream: true });
      let index;
      while ((index = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        let type = '';
        let data = null;
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) type = line.slice(6).trim();
          if (line.startsWith('data:')) try { data = JSON.parse(line.slice(5)); } catch { /* 忽略 */ }
        }
        if (!data || data.chatId !== chat.id) continue;
        if (type === 'message' && data.delta) { process.stdout.write(data.delta); printedThisRun = true; }
        if (type === 'tool_calls') {
          const item = data.row?.item;
          let command = '';
          try { command = JSON.parse(item?.arguments || '{}').command || ''; } catch { /* 忽略 */ }
          process.stdout.write(`\n[bash] ${command.split('\n')[0].slice(0, 120)}\n`);
        }
        if (type === 'tool_results') {
          let out = {};
          try { out = JSON.parse(data.row?.item?.output || '{}'); } catch { /* 忽略 */ }
          process.stdout.write(`[exit ${out.exit_code}]\n`);
        }
        if (type === 'error') process.stdout.write(`\n[error] ${data.message}\n`);
        if (type === 'done') {
          running = false;
          process.stdout.write(printedThisRun ? '\n\n' : '[本轮无文本输出]\n\n');
          rl.prompt();
        }
      }
    }
  })().catch((err) => {
    console.error(`\n[console] 事件流断开:${err.message}`);
    process.exit(1);
  });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '你> ' });
  rl.prompt();
  rl.on('line', async (line) => {
    const text = line.trim();
    if (!text) return rl.prompt();
    running = true;
    printedThisRun = false;
    try {
      await api('POST', `/chats/${chat.id}/messages`, { content: text, source: 'user' });
    } catch (err) {
      console.error(`[console] 发送失败:${err.message}`);
      running = false;
      rl.prompt();
    }
  });
  rl.on('close', () => process.exit(0)); // stdin EOF(管道用法)也要能退出
  rl.on('SIGINT', async () => {
    if (running) {
      await api('POST', `/chats/${chat.id}/stop`).catch(() => {});
      console.log('\n[console] 已停止本轮运行');
      running = false;
      rl.prompt();
    } else {
      rl.close();
      process.exit(0);
    }
  });
}
