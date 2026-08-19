import { spawn } from 'node:child_process';
import { deadly } from './safety.js';

const DEFAULT_TIMEOUT = 60;
const MAX_TIMEOUT = 600;
const MAX_CHARS = 8000;

function clip(text) {
  if (text.length <= MAX_CHARS) return text;
  const head = Math.floor(MAX_CHARS * 0.7);
  const tail = MAX_CHARS - head;
  return `${text.slice(0, head)}\n\n…（中间省略 ${text.length - MAX_CHARS} 字符）…\n\n${text.slice(-tail)}`;
}

export function bash(args, { cwd, signal, env = {} } = {}) {
  const command = String(args.command ?? '').trim();
  if (!command) return Promise.resolve({ error: 'command 不能为空' });
  const why = deadly(command);
  if (why) return Promise.resolve({ error: `这条命令没有运行：${why}。请缩小目标范围。` });

  const seconds = Math.min(MAX_TIMEOUT, Math.max(1, Number(args.timeout) || DEFAULT_TIMEOUT));
  const workdir = String(args.cwd || cwd || process.cwd());
  if (signal?.aborted) return Promise.resolve({ error: '已取消' });

  return new Promise((resolve) => {
    const child = spawn('bash', ['-lc', command], {
      cwd: workdir,
      detached: true,
      env: { ...process.env, ...env },
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let stopped = false;
    const kill = () => {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
    };
    const timer = setTimeout(() => { timedOut = true; kill(); }, seconds * 1000);
    const onAbort = () => { stopped = true; kill(); };
    signal?.addEventListener('abort', onAbort, { once: true });
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (cause) => { done(); resolve({ error: `命令无法启动：${cause.message}` }); });
    child.on('close', (code) => {
      done();
      if (stopped) { resolve({ error: '已取消，进程已停止' }); return; }
      resolve({
        exitCode: timedOut ? null : code,
        stdout: clip(stdout),
        stderr: clip(stderr),
        ...(timedOut && { error: `命令超过 ${seconds} 秒，进程已停止` }),
      });
    });
  });
}
