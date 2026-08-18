import { userItem } from '../../agent/index.js';
import { chats, items } from '../../repository/index.js';
import { publish } from '../events/index.js';
import { isRunning, run } from '../runtime/index.js';

export function message(chatId, content) {
  const chat = chats.get(chatId);
  if (!chat) throw Object.assign(new Error('没有这条对话'), { status: 404 });
  const text = String(content ?? '').trim();
  if (!text) throw Object.assign(new Error('消息不能为空'), { status: 400 });
  if (!chat.title) chats.update(chatId, { title: text.slice(0, 40) });
  const row = items.add(chatId, userItem(text), { source: 'user' });
  publish({ type: 'input', chatId, itemId: row.id, item: row.item, source: row.source });
  if (!isRunning(chatId)) run(chatId);
  return { itemId: row.id, status: 'running' };
}
