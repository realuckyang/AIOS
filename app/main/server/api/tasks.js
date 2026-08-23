// 任务的端点。应用经 apps/_shared/task.js 打到这里 —— 这是通往模型的唯一入口。
import { json, readBody } from '../../../shared/http.js';
import * as tasks from '../repository/tasks.js';
import * as messages from '../repository/messages.js';
import { runInstant, runAgent } from '../service/task.js';

export const prefix = 'tasks';

export async function handle({ req, res, parts, url, config, kernelPort, appPort }) {
  const id = parts[2];

  if (!id && req.method === 'GET') {
    return json(res, 200, tasks.listTasks({ app: url.searchParams.get('app') ?? undefined }));
  }

  if (!id && req.method === 'POST') {
    const body = await readBody(req, config.requestBodyMaxBytes);
    const app = typeof body.app === 'string' ? body.app.trim() : '';
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    if (!app) return json(res, 400, { error: 'app 必须是非空字符串' });
    if (!prompt) return json(res, 400, { error: 'prompt 必须是非空字符串' });
    const mode = body.mode === 'agent' ? 'agent' : 'instant';
    try {
      const result = mode === 'agent'
        ? await runAgent({ app, title: body.title ?? '', prompt, wait: body.wait !== false, kernelPort, appPort })
        : await runInstant({
            app, title: body.title ?? '', prompt,
            instructions: body.instructions ?? '',
            timeoutMs: Number(body.timeoutMs) || config.compactSummaryTimeoutMs || 90_000,
            kernelPort,
          });
      return json(res, 201, result);
    } catch (err) {
      return json(res, 502, { error: String(err?.message ?? err) });
    }
  }

  const task = tasks.getTask(id);
  if (!task) return json(res, 404, { error: `任务不存在: ${id}` });

  if (parts.length === 3 && req.method === 'GET') {
    json(res, 200, task);
  } else if (parts.length === 3 && req.method === 'DELETE') {
    json(res, 200, { ok: tasks.removeTask(id) });
  } else if (parts[3] === 'items' && req.method === 'GET') {
    json(res, 200, messages.listMessages(id));
  } else {
    json(res, 404, { error: 'not found' });
  }
}
