// 模型工具循环:调 llm → 落盘 → 分发工具调用(bash 或 userland/tools.json 里的工具) → 继续,
// 直到模型不再调工具。只认识 store、llm、context、bash、tools 和一个 emit 回调;不认识 HTTP 和调度。
import { execFile } from 'node:child_process';
import * as store from './store.js';
import * as llm from './llm.js';
import * as bash from './bash.js';
import * as tools from './tools.js';
import { buildInput } from './context.js';

// guard 钩子(LSM 式):机制在内核,策略在 userland。
// 配置指向一个可执行文件;exit 0 放行,非 0 拒绝(stdout 为理由)。
// guard 自身不可执行(被删、坏了)时放行并警告——它是灾难刹车,不是安全边界。
function consultGuard(guardPath, command) {
  if (!guardPath) return Promise.resolve(null);
  return new Promise((resolve) => {
    execFile(guardPath, [command], { timeout: 5000 }, (err, stdout, stderr) => {
      if (!err) return resolve(null);
      if (typeof err.code === 'number') return resolve((stdout || stderr || '').trim() || 'guard 拒绝了该命令');
      console.warn(`[kernel] guard 不可执行(${err.code ?? err.message}),本次放行`);
      resolve(null);
    });
  });
}

// 分发一次工具调用:bash 内建执行(经 guard),注册表工具 spawn 对应 exec,
// 都不是则说明模型调了不存在的工具(幻觉或注册表刚被改过),直接把这当结果告诉它。
async function executeCall(call, { config, execByName, signal }) {
  let args = {};
  try { args = JSON.parse(call.arguments || '{}'); } catch { /* 保持空 */ }

  if (call.name === 'bash') {
    const blocked = await consultGuard(config.guard, args.command || '');
    const result = blocked
      ? { exit_code: -1, stdout: '', stderr: blocked }
      : await bash.run(args.command || '', { cwd: config.workdir, timeoutMs: config.bashTimeoutMs, signal });
    return JSON.stringify(result);
  }

  const execPath = execByName.get(call.name);
  if (!execPath) {
    return JSON.stringify({ exit_code: -1, stdout: '', stderr: `未知工具: ${call.name}(不在 userland/tools.json 中)` });
  }
  return tools.dispatch(execPath, call.arguments || '{}', { cwd: config.workdir, timeoutMs: config.bashTimeoutMs, signal });
}

const BASH_TOOL = {
  type: 'function',
  name: 'bash',
  description: '在本机执行 bash 命令。这是你唯一的工具:读写文件、系统命令、curl 内核 API 都通过它。工作目录与超时由内核设置;后台任务用 setsid ... & 自行脱离。',
  parameters: {
    type: 'object',
    properties: { command: { type: 'string', description: '要执行的 bash 命令' } },
    required: ['command'],
  },
};

export async function runLoop({ chatId, config, instructions, signal, emit }) {
  const apiBase = `http://127.0.0.1:${config.kernelPort}/api`;
  // 每次唤醒重新加载:agent 改 userland/tools.json 后下一轮即生效,不需要重启内核。
  const { requestTools, execByName } = tools.loadRegistry(config);
  const requestToolList = [BASH_TOOL, ...requestTools];

  while (true) {
    if (signal.aborted) return;
    const meta = store.getChat(chatId);
    if (!meta) return; // 对话在运行中被删除
    const rows = store.readItems(chatId);
    const input = buildInput({ meta, rows, apiBase });

    const { items, usage } = await llm.request({
      url: config.responsesUrl,
      apiKey: config.apiKey,
      model: config.model,
      instructions,
      input,
      tools: requestToolList,
      signal,
      onDelta: (kind, delta) => emit(kind, { chatId, delta }),
    });
    if (signal.aborted) return;

    const calls = [];
    items.forEach((item, index) => {
      const row = store.appendItem(chatId, {
        source: 'model',
        item,
        usage: index === items.length - 1 ? usage : undefined,
      });
      if (item.type === 'function_call') {
        emit('tool_calls', { chatId, row });
        calls.push(item); // bash、注册表工具都在这里;服务端工具由模型服务执行,不会以此形式出现
      } else {
        emit(item.type === 'reasoning' ? 'reasoning' : 'message', { chatId, row });
      }
    });

    if (calls.length === 0) return;

    for (const call of calls) {
      if (signal.aborted) return;
      const output = await executeCall(call, { config, execByName, signal });
      const row = store.appendItem(chatId, {
        source: 'tool',
        item: { type: 'function_call_output', call_id: call.call_id, output },
      });
      emit('tool_results', { chatId, row });
    }
  }
}
