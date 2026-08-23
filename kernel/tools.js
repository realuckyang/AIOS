// 工具分发钩子(FUSE 式):机制在内核,工具是什么由 etc/tools.json 声明。
// etc/tools.json 声明 [{name, description, parameters, exec}, {type: "web_search"}, ...]。
// 有 exec 的作为 function 工具并入请求;调用时 spawn exec,arguments JSON 从 stdin 喂入,
// stdout 作为 function_call_output(exec 输出合法 JSON 则原样透传,给多模态/结构化结果留口子;
// 否则按 bash 的形状包一层 {exit_code, stdout, stderr})。无 exec 的原样透传给模型服务
// (声明纯服务端工具,如 web_search——执行发生在服务端,内核不参与)。
// bash 不进注册表:它是创世工具,不需要声明,进程组语义住在 kernel/bash.js。
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ROOT } from './paths.js';
import { boundedInteger, createTextCollector } from './utils.js';

export function loadRegistry(config) {
  const file = config.tools ? path.resolve(ROOT, config.tools) : path.join(ROOT, 'etc', 'tools.json');
  const empty = { requestTools: [], execByName: new Map() };
  if (!fs.existsSync(file)) return empty;

  let list;
  try {
    list = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.warn(`[kernel] ${file} 解析失败,本轮忽略:${err.message}`);
    return empty;
  }

  const execByName = new Map();
  const requestTools = [];
  for (const tool of list) {
    if (tool.exec) {
      const { exec, ...declaration } = tool;
      requestTools.push({ type: 'function', ...declaration });
      execByName.set(tool.name, path.resolve(ROOT, exec));
    } else {
      requestTools.push(tool);
    }
  }
  return { requestTools, execByName };
}

export function dispatch(execPath, argumentsJson, { cwd, timeoutMs, maxOutputChars = 50_000, signal } = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(execPath, [], { cwd, signal });
    } catch (err) {
      return resolve(JSON.stringify({ exit_code: -1, stdout: '', stderr: `工具不可执行: ${err.message}` }));
    }
    const limit = boundedInteger(maxOutputChars, 50_000);
    const stdout = createTextCollector(limit);
    const stderr = createTextCollector(limit);
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      try { child.kill('SIGKILL'); } catch { /* 已退出 */ }
    }, timeoutMs ?? 60_000);

    child.stdin.write(argumentsJson ?? '{}');
    child.stdin.end();
    child.stdout.on('data', (d) => stdout.push(d));
    child.stderr.on('data', (d) => stderr.push(d));
    child.on('error', (err) => stderr.push(err));
    child.on('close', (code) => {
      clearTimeout(timer);
      try {
        if (stdout.truncated) throw new Error('输出超限');
        const value = stdout.value();
        JSON.parse(value);
        resolve(value.trim()); // 合法 JSON:exec 自己决定输出形状,原样透传
      } catch {
        resolve(JSON.stringify({
          exit_code: killed ? -1 : (code ?? -1),
          stdout: stdout.value(),
          stderr: stderr.value(),
        }));
      }
    });
  });
}
