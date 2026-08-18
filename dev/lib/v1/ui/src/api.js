async function request(method, path, body) {
  const response = await fetch(path, {
    method,
    ...(body && { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `请求失败 (${response.status})`);
  return data;
}

export const listChats = (origin = 'user') => request('GET', `/api/chats?origin=${origin}`);
export const createChat = (data = {}) => request('POST', '/api/chats', data);
export const getChat = (id) => request('GET', `/api/chats/${id}`);
export const updateChat = (id, changes) => request('PATCH', `/api/chats/${id}`, changes);
export const removeChat = (id) => request('DELETE', `/api/chats/${id}`);
export const listItems = (id) => request('GET', `/api/chats/${id}/items`);
export const sendMessage = (id, content) => request('POST', `/api/chats/${id}/messages`, { content });
export const stopChat = (id) => request('POST', `/api/chats/${id}/stop`);
export const listCalls = (id) => request('GET', `/api/chats/${id}/calls`);
export const listCreatedChats = (id) => request('GET', `/api/chats/${id}/created-chats`);
export const getCall = (id) => request('GET', `/api/calls/${id}`);
export const createCall = (id, data) => request('POST', `/api/chats/${id}/calls`, data);
export const listSettings = () => request('GET', '/api/settings');
export const setSetting = (key, value) => request('PUT', `/api/settings/${encodeURIComponent(key)}`, { value });
