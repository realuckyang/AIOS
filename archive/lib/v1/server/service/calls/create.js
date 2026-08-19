import { developerItem, userItem } from '../../agent/index.js';
import { calls, chats, items } from '../../repository/index.js';
import { publish } from '../events/index.js';
import { run } from '../runtime/index.js';

export function create(fromChatId, data = {}) {
  if (!chats.get(fromChatId)) throw Object.assign(new Error('没有发起对话'), { status: 404 });
  const text = String(data.message ?? '').trim();
  if (!text) throw Object.assign(new Error('调用消息不能为空'), { status: 400 });
  let target = data.toChatId ? chats.get(data.toChatId) : null;
  if (data.toChatId && !target) throw Object.assign(new Error('没有目标对话'), { status: 404 });
  if (!target) target = chats.create({ title: data.title ?? '', description: data.description ?? '', origin: 'call' });
  if (String(data.context ?? '').trim()) {
    items.add(target.id, developerItem(String(data.context).trim()), { source: 'user' });
  }
  const request = items.add(target.id, userItem(text), { source: 'user' });
  const call = calls.create({ chatId: fromChatId, toChatId: target.id, requestItemId: request.id });
  publish({
    type: 'input', chatId: target.id, itemId: request.id,
    item: request.item, source: request.source,
  });
  publish({ type: 'call', chatId: fromChatId, callId: call.id, toChatId: target.id,
    requestItemId: call.requestItemId, responseItemId: call.responseItemId,
    status: call.status, createdAt: call.createdAt, completedAt: call.completedAt });
  run(target.id);
  return { callId: call.id, chatId: target.id, requestItemId: request.id, status: call.status };
}
