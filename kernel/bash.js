// bash 执行边界:子进程、进程组、超时、输出截断。
// setsid 逃逸的后台进程刻意杀不到——那是「通知自己」的前提,由约定管理。
import { spawn } from 'node:child_process';
import { boundedInteger, createTextCollector } from './utils.js';

export function run(command, { cwd, timeoutMs = 600_000, maxOutputChars = 50_000, signal } = {}) {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-c', command], { cwd, detached: true });
    const limit = boundedInteger(maxOutputChars, 50_000);
    const stdout = createTextCollector(limit);
    const stderr = createTextCollector(limit);
    let killed = false;

    const kill = () => {
      killed = true;
      try { process.kill(-child.pid, 'SIGKILL'); } catch { /* 已退出 */ }
    };
    const timer = setTimeout(kill, timeoutMs);
    const onAbort = () => kill();
    signal?.addEventListener('abort', onAbort, { once: true });

    child.stdout.on('data', (d) => stdout.push(d));
    child.stderr.on('data', (d) => stderr.push(d));
    child.on('error', (err) => stderr.push(err));
    child.on('close', (code) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve({
        exit_code: killed ? -1 : (code ?? -1),
        stdout: stdout.value(),
        stderr: stderr.value(),
        ...(killed ? { killed: signal?.aborted ? 'stopped' : 'timeout' } : {}),
      });
    });
  });
}
