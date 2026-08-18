// userland 服务入口:静态托管 ui/,并把 /api 反代到内核(浏览器同源,免 CORS)。
// 这个文件属于 userland:agent 可改、可重启、可炸,内核的 init 会拉起它。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const UI = path.join(ROOT, 'ui');
const PORT = Number(process.env.USERLAND_PORT) || 9601;
const KERNEL = Number(process.env.KERNEL_PORT) || 9600;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

http.createServer((req, res) => {
  if (req.url === '/api' || req.url.startsWith('/api/')) {
    // 反代到内核(含 SSE 流式透传)
    const proxy = http.request(
      { host: '127.0.0.1', port: KERNEL, path: req.url, method: req.method, headers: req.headers },
      (upstream) => {
        res.writeHead(upstream.statusCode, upstream.headers);
        upstream.pipe(res);
      },
    );
    proxy.on('error', () => {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: '内核不可达' }));
    });
    req.pipe(proxy);
    return;
  }

  const clean = path.normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = path.join(UI, clean);
  if (!file.startsWith(UI)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(UI, 'index.html');
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`[userland] http://127.0.0.1:${PORT} → kernel :${KERNEL}`);
});
