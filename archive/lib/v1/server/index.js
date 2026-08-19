//后端入口，启动服务，托管静态网站
// 端口是数据库打开前必须确定的启动参数。
//
// 一个进程干两件事:把 ui/dist 当静态站发出去,把 /api/* 交给路由表。
// 分成两个服务的那天再拆 —— 现在多一个端口只是多一处要记得同时起的东西。

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { handleApi } from './api/index.js';
const PORT = Number(process.env.PORT) || 9522;

const ROOT = resolve(fileURLToPath(new URL('../ui/dist', import.meta.url)));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

/**
 * 发一个静态文件。找不到就回 index.html —— 前端是单页的,
 * 刷新一个前端路由(比如 /chat/xxx)时磁盘上并没有那个文件。
 */
async function serveStatic(req, res) {
  // normalize + 前缀检查:挡住 ../../etc/passwd 这类
  const wanted = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  let file = join(ROOT, wanted === '/' ? 'index.html' : wanted);
  if (!file.startsWith(ROOT)) file = join(ROOT, 'index.html');

  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) file = join(ROOT, 'index.html');

  const exists = await stat(file).catch(() => null);
  if (!exists) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('前端还没构建 —— 先跑 npm run build');
    return;
  }

  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}

const server = createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) {
      await handleApi(req, res);
      return;
    }
    await serveStatic(req, res);
  } catch (cause) {
    // 兜到这儿说明是我们自己的 bug,不是用户输入的问题 —— 打出来,别静默
    console.error('[server]', cause);
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: String(cause.message ?? cause) }));
  }
});

// 只绑 127.0.0.1:一来不对外,二来不会出现「IPv6 绑上了、IPv4 被别人占着」
// 这种两边都 listen 成功、请求却打给别人的局面
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Agent 起来了  http://127.0.0.1:${PORT}`);
});
