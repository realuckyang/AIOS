// App 服务入口:拥有对话 API 与持久化,并静态托管 app/ui/dist。
// 构建:cd app/ui && npm install && npm run build
// 开发:cd app/ui && npm run dev → http://127.0.0.1:5173（/api 代理到 App）
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { handleApi } from './api.js';
import { completeRestartRequests, ensureVarDir } from './store.js';
import { configure as configureEvents } from './events.js';
import { seedDefaults } from './config.js';
import { getConfig } from './config.js';
import { RUN_DIR } from '../../host.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATIC_ROOT = path.join(ROOT, 'ui', 'dist');
const PORT = Number(process.env.APP_PORT) || 9523;
const KERNEL = Number(process.env.KERNEL_PORT) || 9522;
const INSTANCE_ID = crypto.randomUUID();
const STARTED_AT = new Date().toISOString();
const BOOT_PID_FILE = path.join(RUN_DIR, 'boot.pid');


const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

ensureVarDir();          // settings 表在库里,所以配置要等库就绪之后才合并
seedDefaults();          // 把默认值写进库 —— 库从此是完整的当前状态,不再只存「改过的」
configureEvents(getConfig());
completeRestartRequests(INSTANCE_ID);

function bootPid() {
  const pid = Number(fs.readFileSync(BOOT_PID_FILE, 'utf8').trim());
  if (!Number.isInteger(pid) || pid <= 1) throw new Error('Boot PID 无效');
  process.kill(pid, 0);
  return pid;
}

function requestAppRestart() { process.kill(bootPid(), 'SIGHUP'); }

http.createServer(async (req, res) => {
  if (req.url === '/api' || req.url.startsWith('/api/')) {
    await handleApi(req, res, {
      kernelPort: KERNEL,
      appPort: PORT,
      health: { ok: true, instanceId: INSTANCE_ID, startedAt: STARTED_AT },
      canRestartApp: () => { bootPid(); return true; },
      requestAppRestart,
    });
    return;
  }

  const clean = path.normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\\.\\.[/\\\\])+/, '');
  let file = path.join(STATIC_ROOT, clean);
  if (!file.startsWith(STATIC_ROOT)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(STATIC_ROOT, 'index.html');
  if (!fs.existsSync(file)) {
    res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('UI 尚未构建: cd app/ui && npm run build\n');
  }
  const ext = path.extname(file);
  // HTML 不缓存(改完刷新即生效);带 hash 的静态资源可长缓存
  const cacheControl = ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable';
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    'cache-control': cacheControl,
  });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`[app] http://127.0.0.1:${PORT} → kernel :${KERNEL} · static=${STATIC_ROOT}`);
});
