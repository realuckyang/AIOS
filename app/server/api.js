// App API:对话、持久化、调度和 UI 事件都在这里；Kernel 只执行一次 run。
import * as store from './store.js';
import * as run from './run.js';
import * as events from './events.js';
import { publicConfig, updateConfig } from './config.js';
import { getSkill, listSkills } from './skills.js';
import { saveFile } from './files.js';
import { getTool, listTools } from './tools.js';

function json(res, code, data) {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let bytes = 0;
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        reject(new Error(`请求体超过限制: ${maxBytes} bytes`));
        req.destroy();
        return;
      }
      raw += chunk;
    });
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
// 标准 Responses 输入消息:文本 + 图片(input_image,image_url 为 data: 或 http(s) URL)
const inputItem = (content, images = []) => ({
  type: 'message',
  role: 'user',
  content: [
    ...(String(content ?? '') ? [{ type: 'input_text', text: String(content) }] : []),
    ...images.map((url) => ({ type: 'input_image', image_url: String(url) })),
  ],
});
// 合法输入 = 有文本或有图。images 必须是字符串数组(不传视为空)
const validInput = (content, images) =>
  (images === undefined || (Array.isArray(images) && images.every((one) => typeof one === 'string' && one)))
  && (String(content ?? '') || (Array.isArray(images) && images.length > 0));

export async function handleApi(req, res, {
  kernelPort, appPort, config, health, canRestartApp, requestAppRestart,
}) {
  const url = new URL(req.url, 'http://127.0.0.1');
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'api') return false;

  try {
    if (parts[1] === 'health' && req.method === 'GET') {
      json(res, 200, health);
      return true;
    }

    if (parts[1] === 'events' && req.method === 'GET') {
      events.subscribe(req, res);
      return true;
    }

    if (parts[1] === 'config' && parts.length === 2) {
      if (req.method === 'GET') {
        json(res, 200, publicConfig(config));
      } else if (req.method === 'PATCH') {
        const body = await readBody(req, config.requestBodyMaxBytes);
        updateConfig(config, body);
        events.configure(config);
        json(res, 200, { config: publicConfig(config), restartRequired: true });
      } else {
        json(res, 405, { error: 'method not allowed' });
      }
      return true;
    }

    // 拖/选进来的非图片文件:内容落 var/files,换回本地路径给消息文本引用
    if (parts[1] === 'files' && parts.length === 2 && req.method === 'POST') {
      const body = await readBody(req, config.requestBodyMaxBytes);
      const match = /^data:[^;,]*;base64,(.+)$/s.exec(String(body.data ?? ''));
      if (!match) json(res, 400, { error: 'data 必须是 base64 data URL' });
      else json(res, 201, { path: saveFile(body.name, Buffer.from(match[1], 'base64')) });
      return true;
    }

    if (parts[1] === 'skills' && req.method === 'GET') {
      if (parts.length === 2) json(res, 200, listSkills());
      else {
        const skill = getSkill(parts[2]);
        if (skill) json(res, 200, skill);
        else json(res, 404, { error: `Skill 不存在: ${parts[2]}` });
      }
      return true;
    }

    if (parts[1] === 'tools' && req.method === 'GET') {
      if (parts.length === 2) json(res, 200, listTools());
      else {
        const tool = getTool(parts[2]);
        if (tool) json(res, 200, tool);
        else json(res, 404, { error: `工具不存在: ${parts[2]}` });
      }
      return true;
    }

    // 待办:todo 应用的命名端点。id 是 8 位 hex,不会与 'done' 撞路由
    if (parts[1] === 'todos') {
      const id = parts[2];
      if (!id && req.method === 'GET') {
        json(res, 200, store.listTodos());
      } else if (!id && req.method === 'POST') {
        const body = await readBody(req, config.requestBodyMaxBytes);
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        if (!title) json(res, 400, { error: 'title 必须是非空字符串' });
        else json(res, 201, store.createTodo(title));
      } else if (id === 'done' && req.method === 'DELETE') {
        json(res, 200, { cleared: store.clearDoneTodos() });
      } else if (id && parts.length === 3 && req.method === 'PATCH') {
        const body = await readBody(req, config.requestBodyMaxBytes);
        if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim())) {
          json(res, 400, { error: 'title 必须是非空字符串' });
          return true;
        }
        const todo = store.updateTodo(id, {
          ...(body.title !== undefined ? { title: body.title.trim() } : {}),
          ...(body.done !== undefined ? { done: Boolean(body.done) } : {}),
        });
        if (todo) json(res, 200, todo);
        else json(res, 404, { error: `待办不存在: ${id}` });
      } else if (id && parts.length === 3 && req.method === 'DELETE') {
        if (store.removeTodo(id)) json(res, 200, { ok: true });
        else json(res, 404, { error: `待办不存在: ${id}` });
      } else {
        json(res, 404, { error: 'not found' });
      }
      return true;
    }

    // 记忆:memory 应用的命名端点。id 是 8 位 hex,不会与 'tags' 撞路由。
    if (parts[1] === 'memories') {
      const id = parts[2];
      if (!id && req.method === 'GET' && url.searchParams.get('tag')) {
        json(res, 200, store.listMemories({ tag: url.searchParams.get('tag') }));
      } else if (!id && req.method === 'GET') {
        json(res, 200, store.listMemories());
      } else if (!id && req.method === 'POST') {
        const body = await readBody(req, config.requestBodyMaxBytes);
        try {
          const source = body.source === 'agent' || body.source === 'runtime' ? body.source : 'manual';
          json(res, 201, store.createMemory({ title: body.title, body: body.body, tags: body.tags, source }));
        } catch (err) {
          json(res, 400, { error: String(err?.message ?? err) });
        }
      } else if (id === 'tags' && req.method === 'GET') {
        json(res, 200, store.memoryTags());
      } else if (id && parts.length === 3 && req.method === 'GET') {
        const memory = store.getMemory(id);
        if (memory) json(res, 200, memory);
        else json(res, 404, { error: `记忆不存在: ${id}` });
      } else if (id && parts.length === 3 && req.method === 'PATCH') {
        const body = await readBody(req, config.requestBodyMaxBytes);
        try {
          const memory = store.updateMemory(id, body);
          if (memory) json(res, 200, memory);
          else json(res, 404, { error: `记忆不存在: ${id}` });
        } catch (err) {
          json(res, 400, { error: String(err?.message ?? err) });
        }
      } else if (id && parts.length === 3 && req.method === 'DELETE') {
        if (store.removeMemory(id)) json(res, 200, { ok: true });
        else json(res, 404, { error: `记忆不存在: ${id}` });
      } else {
        json(res, 404, { error: 'not found' });
      }
      return true;
    }

    if (parts[1] === 'system' && parts[2] === 'restarts') {
      const id = parts[3];
      if (!id && req.method === 'POST') {
        const body = await readBody(req, config.requestBodyMaxBytes);
        const request = store.createRestartRequest(body);
        events.publish('restart_requested', { request });
        json(res, 201, request);
      } else if (id === 'pending' && req.method === 'GET') {
        json(res, 200, store.getPendingRestart());
      } else if (id && parts[4] === 'confirm' && req.method === 'POST') {
        canRestartApp();
        const request = store.confirmRestartRequest(id);
        if (!request) json(res, 409, { error: '重启申请不存在或已处理' });
        else {
          events.publish('restart_confirmed', { request });
          json(res, 202, request);
          setImmediate(() => requestAppRestart());
        }
      } else if (id && parts.length === 4 && req.method === 'DELETE') {
        const cancelled = store.cancelRestartRequest(id);
        if (cancelled) events.publish('restart_cancelled', { id });
        json(res, cancelled ? 200 : 409, cancelled ? { cancelled: true } : { error: '重启申请不存在或已处理' });
      } else {
        json(res, 404, { error: 'not found' });
      }
      return true;
    }

    if (parts[1] !== 'chats') {
      json(res, 404, { error: 'not found' });
      return true;
    }

    const id = parts[2];
    if (!id && req.method === 'GET') {
      json(res, 200, store.listChats().map(withStatus));
      return true;
    }

    if (!id && req.method === 'POST') {
      const body = await readBody(req, config.requestBodyMaxBytes);
      const hasMessage = body.message?.content != null || body.message?.images !== undefined;
      if (hasMessage && !INPUT_SOURCES.has(body.message.source)) {
        json(res, 400, { error: 'message.source 必须是 user 或 runtime' });
        return true;
      }
      if (hasMessage && !validInput(body.message.content, body.message.images)) {
        json(res, 400, { error: 'message 需要非空 content 或 images(字符串数组)' });
        return true;
      }
      const meta = store.createChat({ title: body.title ?? '', description: body.description ?? '' });
      if (hasMessage) {
        const row = store.appendItem(meta.id, { source: body.message.source, item: inputItem(body.message.content, body.message.images ?? []) });
        events.publish('input', { chatId: meta.id, row });
        run.wake(meta.id, { kernelPort, appPort, sseEventMaxBytes: config.sseEventMaxBytes });
      }
      json(res, 201, withStatus(store.getChat(meta.id)));
      return true;
    }

    const meta = id ? store.getChat(id) : null;
    if (!meta) {
      json(res, 404, { error: `对话不存在: ${id}` });
      return true;
    }

    if (parts.length === 3 && req.method === 'GET') {
      json(res, 200, withStatus(meta));
    } else if (parts.length === 3 && req.method === 'PATCH') {
      const body = await readBody(req, config.requestBodyMaxBytes);
      if (body.context_start !== undefined && !(Number.isInteger(body.context_start) && body.context_start >= 0)) {
        json(res, 400, { error: 'context_start 必须是非负整数' });
      } else if (body.pinned !== undefined && typeof body.pinned !== 'boolean') {
        json(res, 400, { error: 'pinned 必须是布尔值' });
      } else {
        json(res, 200, withStatus(store.updateChat(id, body)));
      }
    } else if (parts.length === 3 && req.method === 'DELETE') {
      run.stop(id);
      store.removeChat(id);
      events.publish('status', { chatId: id, status: 'deleted' });
      json(res, 200, { ok: true });
    } else if (parts[3] === 'stop' && req.method === 'POST') {
      json(res, 200, { stopped: run.stop(id) });
    } else if (parts[3] === 'items' && req.method === 'GET') {
      if (url.searchParams.has('limit') || url.searchParams.has('before')) {
        const before = Number(url.searchParams.get('before')) || Infinity;
        const limit = Number(url.searchParams.get('limit')) || 50;
        json(res, 200, store.readItemsPage(id, { beforeSeq: before, limit }));
      } else {
        json(res, 200, store.readItems(id, { afterSeq: Number(url.searchParams.get('after')) || 0 }));
      }
    } else if (parts[3] === 'messages' && req.method === 'POST') {
      const body = await readBody(req, config.requestBodyMaxBytes);
      if (!validInput(body.content, body.images)) json(res, 400, { error: '需要非空 content 或 images(字符串数组)' });
      else if (!INPUT_SOURCES.has(body.source)) json(res, 400, { error: 'source 必须是 user 或 runtime' });
      else {
        const row = store.appendItem(id, { source: body.source, item: inputItem(body.content, body.images ?? []) });
        events.publish('input', { chatId: id, row });
        run.wake(id, { kernelPort, appPort, sseEventMaxBytes: config.sseEventMaxBytes });
        json(res, 201, { seq: row.seq });
      }
    } else {
      json(res, 404, { error: 'not found' });
    }
    return true;
  } catch (err) {
    json(res, 500, { error: String(err?.message ?? err) });
    return true;
  }
}
