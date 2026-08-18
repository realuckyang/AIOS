// HTTP 协议层:唯一写入口。路由 → store/run → JSON。只监听 127.0.0.1。
import http from 'node:http';
import * as store from './store.js';
import * as run from './run.js';
import * as events from './events.js';

function json(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (d) => { raw += d; });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('请求体不是合法 JSON')); }
    });
    req.on('error', reject);
  });
}

function withStatus(meta) {
  return { ...meta, status: run.isRunning(meta.id) ? 'running' : 'idle' };
}

const INPUT_SOURCES = new Set(['user', 'runtime']);

function inputItem(content) {
  return { type: 'message', role: 'user', content: [{ type: 'input_text', text: String(content) }] };
}

export function startServer({ config, instructions }) {
  const ctx = { config, instructions };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const parts = url.pathname.split('/').filter(Boolean); // ['api', 'chats', ':id', ...]
    try {
      if (parts[0] !== 'api') return json(res, 404, { error: 'not found' });

      if (parts[1] === 'events' && req.method === 'GET') return events.subscribe(req, res);

      if (parts[1] === 'chats') {
        const id = parts[2];

        if (!id && req.method === 'GET') return json(res, 200, store.listChats().map(withStatus));

        if (!id && req.method === 'POST') {
          const body = await readBody(req);
          const meta = store.createChat({ title: body.title ?? '', description: body.description ?? '' });
          if (body.message?.content != null) {
            const source = body.message.source;
            if (!INPUT_SOURCES.has(source)) return json(res, 400, { error: 'message.source 必须是 user 或 runtime' });
            const row = store.appendItem(meta.id, { source, item: inputItem(body.message.content) });
            events.publish('input', { chatId: meta.id, row });
            run.wake(meta.id, ctx);
          }
          return json(res, 201, withStatus(store.getChat(meta.id)));
        }

        const meta = id ? store.getChat(id) : null;
        if (id && !meta) return json(res, 404, { error: `对话不存在: ${id}` });

        if (parts.length === 3 && req.method === 'GET') return json(res, 200, withStatus(meta));

        if (parts.length === 3 && req.method === 'PATCH') {
          const body = await readBody(req);
          if (body.context_start !== undefined && !(Number.isInteger(body.context_start) && body.context_start >= 0)) {
            return json(res, 400, { error: 'context_start 必须是非负整数' });
          }
          return json(res, 200, withStatus(store.updateChat(id, body)));
        }

        if (parts.length === 3 && req.method === 'DELETE') {
          run.stop(id);
          store.removeChat(id);
          events.publish('status', { chatId: id, status: 'deleted' });
          return json(res, 200, { ok: true });
        }

        if (parts[3] === 'stop' && req.method === 'POST') {
          return json(res, 200, { stopped: run.stop(id) });
        }

        if (parts[3] === 'items' && req.method === 'GET') {
          const afterSeq = Number(url.searchParams.get('after')) || 0;
          return json(res, 200, store.readItems(id, { afterSeq }));
        }

        if (parts[3] === 'messages' && req.method === 'POST') {
          const body = await readBody(req);
          if (body.content == null) return json(res, 400, { error: '缺少 content' });
          if (!INPUT_SOURCES.has(body.source)) return json(res, 400, { error: 'source 必须是 user 或 runtime' });
          const row = store.appendItem(id, { source: body.source, item: inputItem(body.content) });
          events.publish('input', { chatId: id, row });
          run.wake(id, ctx);
          return json(res, 201, { seq: row.seq });
        }
      }

      return json(res, 404, { error: 'not found' });
    } catch (err) {
      return json(res, 500, { error: String(err?.message ?? err) });
    }
  });

  server.listen(config.kernelPort, '127.0.0.1');
  return server;
}
