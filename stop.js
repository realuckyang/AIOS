// 停止根启动器；boot.js 会负责关闭 App 与 Kernel。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(ROOT, 'run', 'boot.pid');

if (!fs.existsSync(file)) {
  console.log('[boot] 未运行（PID 文件不存在）');
  process.exit(0);
}

const pid = Number(fs.readFileSync(file, 'utf8').trim());
if (!Number.isInteger(pid) || pid <= 1) {
  console.error('[boot] PID 文件无效，请检查 run/boot.pid');
  process.exit(1);
}

try {
  process.kill(pid, 'SIGTERM');
} catch (err) {
  if (err.code === 'ESRCH') {
    fs.unlinkSync(file);
    console.log(`[boot] 进程 ${pid} 已不存在，已清理 PID 文件`);
    process.exit(0);
  }
  throw err;
}

const deadline = Date.now() + 6000;
while (Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  try { process.kill(pid, 0); } catch {
    console.log(`[boot] 已停止（PID ${pid}）`);
    process.exit(0);
  }
}

console.error(`[boot] 停止超时（PID ${pid}）`);
process.exit(1);
