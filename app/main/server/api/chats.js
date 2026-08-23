// 对话的端点。chat 是框架的一等公民 —— 它不是应用,是框架消息流能力的官方界面。
import { json, readBody } from '../../../shared/http.js';
import * as chats from '../repository/chats.js';
import * as messages from '../repository/messages.js';
import * as run from '../service/run.js';
import * as events from '../events.js';
import { saveImage, sniffImageMime, isFileRef } from '../files.js';

export const prefix = 'chats';

const INPUT_SOURCES = new Set(['user', 'runtime']);

const withStatus = (meta) => ({ ...meta, status: run.isRunning(meta.id) ? 'running' : 'idle' });

// 入库前把图片落盘换成 aios-file:// 引用;http(s)/已是引用的原样留。
// 不认的格式抛错(上层转 400)——顺带按魔数校验,不信浏览器给的 mime。
function persistImages(images = []) {
  return images.map((url) => {
    const s = String(url);
    if (isFileRef(s) || /^https?:\/\//.test(s)) return s;
    const m = /^data:[^;,]*;base64,(.+)$/s.exec(s);
    if (!m) throw new Error('图片必须是 base64 data URL、http(s) URL 或本地引用');
    const buf = Buffer.from(m[1], 'base64');
    const mime = sniffImageMime(buf);
    if (!mime) throw new Error('不支持的图片格式(仅 jpeg/png/gif/webp)');
    return saveImage(buf, mime);
  });
}

// 标准 Responses 输入消息:文本 + 图片。image_url 存引用,发模型时才内联字节。
const inputItem = (content, images = []) => ({
  type: 'message',
  role: 'user',
  content: [
    ...(String(content ?? '') ? [{ type: 'input_text', text: String(content) }] : []),
    ...images.map((url) => ({ type: 'input_image', image_url: String(url) })),
  ],
});

const validInput = (content, images) =>
  (images === undefined || (Array.isArray(images) && images.every((one) => typeof one === 'string' && one)))
  && (String(content ?? '') || (Array.isArray(images) && images.length > 0));

export async function handle({ req, res, parts, url, config, kernelPort, appPort }) {
  const id = parts[2];

  if (!id && req.method === 'GET') {
    return json(res, 200, chats.listChats().map(withStatus));
  }

  if (!id && req.method === 'POST') {
    const body = await readBody(req, config.requestBodyMaxBytes);
    const hasMessage = body.message?.content != null || body.message?.images !== undefined;
    if (hasMessage && !INPUT_SOURCES.has(body.message.source)) {
      return json(res, 400, { error: 'message.source 必须是 user 或 runtime' });
    }
    if (hasMessage && !validInput(body.message.content, body.message.images)) {
      return json(res, 400, { error: 'message 需要非空 content 或 images(字符串数组)' });
    }
    let images;
    try { images = persistImages(body.message?.images ?? []); }
    catch (e) { return json(res, 400, { error: e.message }); }
    const meta = chats.createChat({ title: body.title ?? '', description: body.description ?? '' });
    if (hasMessage) {
      const row = messages.appendMessage(meta.id, {
        source: body.message.source, item: inputItem(body.message.content, images),
      });
      events.publish('input', { threadId: meta.id, row });
      run.wake(meta.id, { kernelPort, appPort });
    }
    return json(res, 201, withStatus(chats.getChat(meta.id)));
  }

  const meta = id ? chats.getChat(id) : null;
  if (!meta) return json(res, 404, { error: `对话不存在: ${id}` });

  if (parts.length === 3 && req.method === 'GET') {
    json(res, 200, withStatus(meta));
  } else if (parts.length === 3 && req.method === 'PATCH') {
    const body = await readBody(req, config.requestBodyMaxBytes);
    if (body.context_start !== undefined && !(Number.isInteger(body.context_start) && body.context_start >= 0)) {
      json(res, 400, { error: 'context_start 必须是非负整数' });
    } else if (body.pinned !== undefined && typeof body.pinned !== 'boolean') {
      json(res, 400, { error: 'pinned 必须是布尔值' });
    } else {
      json(res, 200, withStatus(chats.updateChat(id, body)));
    }
  } else if (parts.length === 3 && req.method === 'DELETE') {
    run.stop(id);
    chats.removeChat(id);   // 删 threads 那一行,挂表全靠外键级联
    events.publish('status', { threadId: id, status: 'deleted' });
    json(res, 200, { ok: true });
  } else if (parts[3] === 'stop' && req.method === 'POST') {
    json(res, 200, { stopped: run.stop(id) });
  } else if (parts[3] === 'items' && req.method === 'GET') {
    if (url.searchParams.has('limit') || url.searchParams.has('before')) {
      const before = Number(url.searchParams.get('before')) || undefined;
      const limit = Number(url.searchParams.get('limit')) || 50;
      json(res, 200, messages.pageMessages(id, { before, limit }));
    } else {
      const after = Number(url.searchParams.get('after')) || 0;
      json(res, 200, messages.listMessages(id).filter((row) => row.seq > after));
    }
  } else if (parts[3] === 'messages' && req.method === 'POST') {
    const body = await readBody(req, config.requestBodyMaxBytes);
    if (!validInput(body.content, body.images)) {
      json(res, 400, { error: '需要非空 content 或 images(字符串数组)' });
    } else if (!INPUT_SOURCES.has(body.source)) {
      json(res, 400, { error: 'source 必须是 user 或 runtime' });
    } else {
      let images;
      try { images = persistImages(body.images ?? []); }
      catch (e) { return json(res, 400, { error: e.message }); }
      const row = messages.appendMessage(id, { source: body.source, item: inputItem(body.content, images) });
      events.publish('input', { threadId: id, row });
      run.wake(id, { kernelPort, appPort });
      json(res, 201, { seq: row.seq });
    }
  } else {
    json(res, 404, { error: 'not found' });
  }
}
