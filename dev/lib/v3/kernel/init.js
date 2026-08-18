// init(PID 1):拉起 userland 进程,退出后带退避重启。
// 拉起谁是配置;spawn 与重启是机制。内核不知道 userland 里跑的是什么。
import { spawn } from 'node:child_process';

export function startInit({ config }) {
  if (!config.init) return;
  let backoff = 1000;
  let child = null;
  let shuttingDown = false;

  const launch = () => {
    if (shuttingDown) return;
    child = spawn(config.init, {
      shell: true,
      stdio: 'inherit',
      env: {
        ...process.env,
        KERNEL_PORT: String(config.kernelPort),
        USERLAND_PORT: String(config.userlandPort),
      },
    });
    const startedAt = Date.now();
    child.on('exit', (code) => {
      if (shuttingDown) return;
      if (Date.now() - startedAt > 60_000) backoff = 1000; // 活过一分钟视为健康,重置退避
      console.log(`[init] userland 退出(code=${code}),${backoff / 1000}s 后重启`);
      setTimeout(launch, backoff);
      backoff = Math.min(backoff * 2, 60_000);
    });
  };

  launch();

  const shutdown = () => {
    shuttingDown = true;
    if (child) try { child.kill(); } catch { /* 已退出 */ }
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
