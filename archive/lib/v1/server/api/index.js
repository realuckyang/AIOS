import { createCall, getCall, listCalls } from './calls/index.js';
import { createChat, createdChats, getChat, listChats, removeChat, sendMessage, stopChat, updateChat } from './chats/index.js';
import { subscribe } from './events/index.js';
import { listItems } from './items/index.js';
import { listSettings, setSetting } from './settings/index.js';

const ROUTES = [
  ['GET', '/api/events', subscribe],
  ['GET', '/api/chats', listChats],
  ['POST', '/api/chats', createChat],
  ['GET', '/api/chats/:id', getChat],
  ['PATCH', '/api/chats/:id', updateChat],
  ['DELETE', '/api/chats/:id', removeChat],
  ['GET', '/api/chats/:id/items', listItems],
  ['POST', '/api/chats/:id/messages', sendMessage],
  ['POST', '/api/chats/:id/stop', stopChat],
  ['GET', '/api/chats/:id/created-chats', createdChats],
  ['POST', '/api/chats/:id/calls', createCall],
  ['GET', '/api/chats/:id/calls', listCalls],
  ['GET', '/api/calls/:id', getCall],
  ['GET', '/api/settings', listSettings],
  ['PUT', '/api/settings/:key', setSetting],
].map(([method, path, handler]) => ({ method, path, handler }));

function match(method, pathname) {
  const parts = pathname.split('/').filter(Boolean);
  for (const route of ROUTES) {
    if (route.method !== method) continue;
    const shape = route.path.split('/').filter(Boolean);
    if (shape.length !== parts.length) continue;
    const params = {};
    let hit = true;
    shape.forEach((part, index) => {
      if (part.startsWith(':')) params[part.slice(1)] = decodeURIComponent(parts[index]);
      else if (part !== parts[index]) hit = false;
    });
    if (hit) return { ...route, params };
  }
  return null;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return null;
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('JSON 请求体格式错误'), { status: 400 }); }
}

export const json = (res, data, status = 200) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};

export async function handleApi(req, res) {
  const url = new URL(req.url, 'http://local');
  const route = match(req.method, url.pathname);
  if (!route) { json(res, { error: '没有这个接口' }, 404); return; }
  try {
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readJson(req) : null;
    await route.handler({ req, res, params: route.params, body, url, json });
  } catch (cause) {
    if (!res.headersSent) json(res, { error: String(cause.message ?? cause) }, cause.status ?? 500);
  }
}
