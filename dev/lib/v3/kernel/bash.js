// bash 执行边界:子进程、进程组、超时、输出截断。
// setsid 逃逸的后台进程刻意杀不到——那是「通知自己」的前提,由约定管理。
import { spawn } from 'node:child_process';

const MAX_OUTPUT = 50_000; // 字符,stdout/stderr 各自截断

function truncate(text) {
  if (text.length <= MAX_OUTPUT) return text;
  return text.slice(0, MAX_OUTPUT) + `\n…[输出被内核截断,共 ${text.length} 字符]`;
}

export function run(command, { cwd, timeoutMs = 600_000, signal } = {}) {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-c', command], { cwd, detached: true });
    let stdout = '';
    let stderr = '';
    let killed = false;

    const kill = () => {
      killed = true;
      try { process.kill(-child.pid, 'SIGKILL'); } catch { /* 已退出 */ }
    };
    const timer = setTimeout(kill, timeoutMs);
    const onAbort = () => kill();
    signal?.addEventListener('abort', onAbort, { once: true });

    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (err) => { stderr += String(err); });
    child.on('close', (code) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve({
        exit_code: killed ? -1 : (code ?? -1),
        stdout: truncate(stdout),
        stderr: truncate(stderr),
        ...(killed ? { killed: signal?.aborted ? 'stopped' : 'timeout' } : {}),
      });
    });
  });
}
