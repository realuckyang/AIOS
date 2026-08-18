// 内核 API 客户端。UI 走 userland 的 /api 反代,与内核同源。
const base = '/api';

async function request(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

export const listChats = () => request('GET', '/chats');
export const createChat = (data) => request('POST', '/chats', data);
export const getChat = (id) => request('GET', `/chats/${id}`);
export const deleteChat = (id) => request('DELETE', `/chats/${id}`);
export const stopChat = (id) => request('POST', `/chats/${id}/stop`);
export const listItems = (id) => request('GET', `/chats/${id}/items`);
export const sendMessage = (id, content) => request('POST', `/chats/${id}/messages`, { content, source: 'user' });

export function subscribe(handlers) {
  const es = new EventSource(`${base}/events`);
  for (const [type, fn] of Object.entries(handlers)) {
    es.addEventListener(type, (event) => fn(JSON.parse(event.data)));
  }
  return es;
}
