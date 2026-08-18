// 单次 run 的内存工具循环:调 llm → 分发工具 → 把结果加入本轮工作集 → 继续。
import { execFile } from 'node:child_process';
import * as llm from './llm.js';
import * as bash from './bash.js';
import * as tools from './tools.js';

function bashLimits(config) {
  const min = Number.isFinite(config.bashMinTimeoutMs)
    ? Math.max(1, Math.trunc(config.bashMinTimeoutMs))
    : 1_000;
  const max = Number.isFinite(config.bashTimeoutMs)
    ? Math.max(min, Math.trunc(config.bashTimeoutMs))
    : Math.max(min, 600_000);
  const fallback = Number.isFinite(config.bashDefaultTimeoutMs)
    ? Math.trunc(config.bashDefaultTimeoutMs)
    : 30_000;
  return { min, max, fallback: Math.min(Math.max(min, fallback), max) };
}

function bashTimeout(requested, config) {
  const { min, max, fallback } = bashLimits(config);
  const value = Number.isFinite(requested) ? Math.trunc(requested) : fallback;
  return Math.min(Math.max(min, value), max);
}

// guard 钩子(LSM 式):机制在内核,策略由 bin/guard 提供。
// 配置指向一个可执行文件;exit 0 放行,非 0 拒绝(stdout 为理由)。
// guard 自身不可执行(被删、坏了)时放行并警告——它是灾难刹车,不是安全边界。
function consultGuard(guardPath, command, config) {
  if (!guardPath) return Promise.resolve(null);
  return new Promise((resolve) => {
    execFile(guardPath, [command], { timeout: config.guardTimeoutMs }, (err, stdout, stderr) => {
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
    const blocked = await consultGuard(config.guard, args.command || '', config);
    const result = blocked
      ? { exit_code: -1, stdout: '', stderr: blocked }
      : await bash.run(args.command || '', {
          cwd: config.workdir,
          timeoutMs: bashTimeout(args.timeout_ms, config),
          maxOutputChars: config.toolOutputMaxChars,
          signal,
        });
    return JSON.stringify(result);
  }

  const execPath = execByName.get(call.name);
  if (!execPath) {
    return JSON.stringify({ exit_code: -1, stdout: '', stderr: `未知工具: ${call.name}(不在 etc/tools.json 中)` });
  }
  return tools.dispatch(execPath, call.arguments || '{}', {
    cwd: config.workdir,
    timeoutMs: config.toolTimeoutMs,
    maxOutputChars: config.toolOutputMaxChars,
    signal,
  });
}

function bashTool(config) {
  const { min, max, fallback } = bashLimits(config);
  return {
    type: 'function',
    name: 'bash',
    description: `在本机执行 bash 命令：读写文件、系统命令、curl App API 都可通过它完成。默认超时 ${fallback} ms，可按调用设置 timeout_ms，允许范围 ${min}–${max} ms；后台任务用 setsid ... & 自行脱离。`,
    parameters: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: '用一句简短的中文说明概括这次命令的目的，供界面展示。',
        },
        command: { type: 'string', description: '要执行的 bash 命令' },
        timeout_ms: {
          type: 'integer',
          minimum: min,
          maximum: max,
          description: `本次调用的超时毫秒数。默认 ${fallback}。`,
        },
      },
      required: ['summary', 'command'],
      additionalProperties: false,
    },
  };
}

function stateItem(runId, state, usage) {
  const tokens = usage
    ? `input=${usage.input_tokens ?? '?'} output=${usage.output_tokens ?? '?'}`
    : (state.lastUsage
        ? `input=${state.lastUsage.input_tokens ?? '?'} output=${state.lastUsage.output_tokens ?? '?'}`
        : '无(尚无模型请求)');
  const text = [
    `[kernel 状态行] run=${runId}`,
    state.chatId ? `chat=${state.chatId}` : null,
    `run 起始 seq=${state.latestSeq ?? 0}`,
    `context_start=${state.contextStart ?? 0}`,
    `上次请求 token 用量: ${tokens}`,
    state.appApiBase ? `App API: ${state.appApiBase}` : null,
    `现在: ${new Date().toISOString()}`,
  ].filter(Boolean).join(' · ');
  return { type: 'message', role: 'system', content: [{ type: 'input_text', text }] };
}

export async function runLoop({ runId, input, state = {}, config, instructions, signal, emit }) {
  // 每次 run 重新加载：agent 改 etc/tools.json 后下一次执行即生效，无需重启。
  const { requestTools, execByName } = tools.loadRegistry(config);
  const requestToolList = [bashTool(config), ...requestTools];
  const generated = [];
  let lastUsage = null;

  while (true) {
    if (signal.aborted) return;
    const { items, usage } = await llm.request({
      url: config.responsesUrl,
      apiKey: config.apiKey,
      model: config.model,
      instructions,
      input: [...input, ...generated, stateItem(runId, state, lastUsage)],
      tools: requestToolList,
      signal,
      maxEventBytes: config.sseEventMaxBytes,
      onDelta: (kind, delta) => emit(kind, { delta }),
    });
    if (signal.aborted) return;
    lastUsage = usage;

    const calls = [];
    items.forEach((item, index) => {
      generated.push(item);
      emit('item', { item, usage: index === items.length - 1 ? usage : undefined });
      if (item.type === 'function_call') {
        calls.push(item); // bash、注册表工具都在这里;服务端工具由模型服务执行,不会以此形式出现
      }
    });

    if (calls.length === 0) return;

    for (const call of calls) {
      if (signal.aborted) return;
      const output = await executeCall(call, { config, execByName, signal });
      const item = { type: 'function_call_output', call_id: call.call_id, output };
      generated.push(item);
      emit('tool_result', { item });
    }
  }
}
