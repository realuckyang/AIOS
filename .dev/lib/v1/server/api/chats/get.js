import { get, listCompactions } from '../../service/chats/index.js';
import { errorOf } from '../../service/runtime/index.js';
export function handler({ res, params, json }) {
  const chat = get(params.id);
  if (!chat) throw Object.assign(new Error('没有这条对话'), { status: 404 });
  json(res, { ...chat, error: errorOf(params.id), compactions: listCompactions(params.id) });
}
