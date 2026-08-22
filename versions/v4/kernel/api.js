// Kernel API:只接受一次 run 的完整 input,流式返回本轮结果；不认识 chat 或磁盘历史。
import http from 'node:http';
import path from 'node:path';
import * as run from './run.js';
import * as llm from './llm.js';
import { creds } from './creds.js';
import { readJsonBody, writeJson, writeSSE } from './utils.js';

const json = (res, code, data) => writeJson(res, code, data);

// 正常路径:凭据由 App 随请求传进来(App 是唯一真相)。取到就用,取不到才落到 env.json 兜底。
function bodyCreds(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { responsesUrl, apiKey, model } = raw;
  if ([responsesUrl, apiKey, model].every((v) => typeof v === 'string')) return { responsesUrl, apiKey, model };
  return null;
}

// 只认这几个键,只认合法值:下发通道不该能改凭据、端口或 guard 路径。
const RUN_OPTION_KEYS = new Set([
  'bashMinTimeoutMs', 'bashDefaultTimeoutMs', 'bashTimeoutMs',
  'toolTimeoutMs', 'toolOutputMaxChars', 'guardTimeoutMs',
]);

function runOptions(options, config) {
  if (!options || typeof options !== 'object') return {};
  const out = {};
  for (const [key, value] of Object.entries(options)) {
    if (RUN_OPTION_KEYS.has(key) && Number.isInteger(value) && value >= 0) out[key] = value;
  }
  if (typeof options.model === 'string' && options.model) out.model = options.model;
  // workdir 是路径,按内核自己的根解析,不接受绝对路径之外的花样
  if (typeof options.workdir === 'string' && options.workdir) out.workdir = path.resolve(config.workdir, options.workdir);
  return out;
}

function outputText(items) {
  return items
    .filter((item) => item?.type === 'message')
    .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();
}

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
      // 无工具的一次性补全。凭据只在 Kernel 侧使用,所以 App 需要模型时走这里,
      // 而不是自己拿 apiKey 发请求。不进工具循环,不碰历史。
      if (parts[0] === 'api' && parts[1] === 'complete' && !parts[2] && req.method === 'POST') {
        const body = await readJsonBody(req, config.requestBodyMaxBytes);
        if (!Array.isArray(body.input)) return json(res, 400, { error: 'input 必须是数组' });
        const controller = new AbortController();
        res.on('close', () => controller.abort());
        const live = bodyCreds(body.creds) ?? creds(config);   // App 传的优先,否则 env.json 兜底
        const { items, usage } = await llm.request({
          url: live.responsesUrl,
          apiKey: live.apiKey,
          model: typeof body.model === 'string' && body.model ? body.model : live.model,
          instructions: typeof body.instructions === 'string' ? body.instructions : '',
          input: body.input,
          tools: [],
          signal: controller.signal,
          maxEventBytes: config.sseEventMaxBytes,
        });
        return json(res, 200, { text: outputText(items), usage });
      }

      if (parts[0] !== 'api' || parts[1] !== 'runs') return json(res, 404, { error: 'not found' });

      if (!parts[2] && req.method === 'POST') {
        const body = await readJsonBody(req, config.requestBodyMaxBytes);
        if (typeof body.runId !== 'string' || !body.runId) return json(res, 400, { error: 'runId 必须是非空字符串' });
        if (!Array.isArray(body.input)) return json(res, 400, { error: 'input 必须是数组' });
        if (run.isRunning(body.runId)) return json(res, 409, { error: `run 已在执行: ${body.runId}` });
        // 凭据由 App 随请求传进来(它是唯一真相,设置页改完即时生效);App 缺席时(自愈直连)
        // 落到 env.json 兜底。执行参数走 options 下发;端口/guard 等自身服务器参数仍只来自文件。
        const runConfig = { ...config, ...(bodyCreds(body.creds) ?? creds(config)), ...runOptions(body.options, config) };

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
            config: runConfig,
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
