import { chats, items } from '../../repository/index.js';
import { publish } from '../events/index.js';
import { run } from '../runtime/index.js';
import { developerItem, userItem } from '../../agent/index.js';

export function create(data = {}) {
  const message = String(data.message ?? '').trim();
  const chat = chats.create({
    title: String(data.title ?? '').trim() || message.slice(0, 40),
    description: String(data.description ?? '').trim(),
    // 派生对话必须经由 calls service 创建，才能保留发起方关系。
    // 普通创建接口只负责用户从界面发起的顶层对话。
    origin: 'user',
  });
  if (String(data.context ?? '').trim()) {
    const row = items.add(chat.id, developerItem(String(data.context).trim()), { source: 'user' });
    publish({ type: 'input', chatId: chat.id, itemId: row.id, item: row.item, source: row.source });
  }
  if (message) {
    const row = items.add(chat.id, userItem(message), { source: 'user' });
    publish({ type: 'input', chatId: chat.id, itemId: row.id, item: row.item, source: row.source });
    run(chat.id);
  }
  return chats.get(chat.id);
}
