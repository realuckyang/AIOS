// Kernel API:只接受一次 run 的完整 input,流式返回本轮结果；不认识 chat 或磁盘历史。
import http from 'node:http';
import * as run from './run.js';
import { readJsonBody, writeJson, writeSSE } from './utils.js';

const json = (res, code, data) => writeJson(res, code, data);

export function startServer({ config, instructions }) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const parts = url.pathname.split('/').filter(Boolean);
    try {
      const origin = req.headers.origin || '';
      if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) {
        res.setHeader('access-control-allow-origin', origin);
        res.setHeader('vary', 'origin');
      }
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
          'access-control-max-age': '600',
        });
        return res.end();
      }
      if (parts[0] !== 'api' || parts[1] !== 'runs') return json(res, 404, { error: 'not found' });

      if (!parts[2] && req.method === 'POST') {
        const body = await readJsonBody(req, config.requestBodyMaxBytes);
        if (typeof body.runId !== 'string' || !body.runId) return json(res, 400, { error: 'runId 必须是非空字符串' });
        if (!Array.isArray(body.input)) return json(res, 400, { error: 'input 必须是数组' });
        if (run.isRunning(body.runId)) return json(res, 409, { error: `run 已在执行: ${body.runId}` });

        res.writeHead(200, {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        });
        res.write(': connected\n\n');
        let finished = false;
        res.on('close', () => { if (!finished) run.stop(body.runId); });
        try {
          const outcome = await run.execute({
            runId: body.runId,
            input: body.input,
            state: body.state ?? {},
            config,
            instructions,
            emit: (type, data) => writeSSE(res, type, data),
          });
          writeSSE(res, 'done', { runId: body.runId, outcome });
        } catch (err) {
          writeSSE(res, 'error', { runId: body.runId, message: String(err?.message ?? err) });
          writeSSE(res, 'done', { runId: body.runId, outcome: 'error' });
        } finally {
          finished = true;
          res.end();
        }
        return;
      }

      const runId = parts[2];
      if (runId && parts.length === 3 && req.method === 'GET') {
        return json(res, 200, { runId, status: run.isRunning(runId) ? 'running' : 'idle' });
      }
      if (runId && parts[3] === 'stop' && req.method === 'POST') {
        return json(res, 200, { stopped: run.stop(runId) });
      }
      return json(res, 404, { error: 'not found' });
    } catch (err) {
      return json(res, 500, { error: String(err?.message ?? err) });
    }
  });
  server.listen(config.kernelPort, '127.0.0.1');
  return server;
}
