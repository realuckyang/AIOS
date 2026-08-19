import { userItem } from '../../agent/index.js';
import { calls, chats, items } from '../../repository/index.js';
import { publish } from '../events/index.js';

export async function finish(call, status, text) {
  let response = null;
  if (chats.get(call.chatId)) {
    const body = status === 'completed'
      ? String(text || '(目标对话没有返回正文)')
      : status === 'cancelled' ? '目标对话已停止。' : '目标对话运行失败。';
    response = items.add(call.chatId, userItem(body), { source: 'runtime' });
    publish({
      type: 'input', chatId: call.chatId, callId: call.id, itemId: response.id,
      item: response.item, source: response.source,
    });
  }
  const saved = calls.finish(call.id, status, response?.id ?? null);
  publish({ type: 'call', chatId: call.chatId, callId: call.id, toChatId: call.toChatId,
    requestItemId: saved.requestItemId, responseItemId: saved.responseItemId,
    status: saved.status, createdAt: saved.createdAt, completedAt: saved.completedAt });
  if (status === 'completed' && chats.get(call.chatId)) {
    const runtime = await import('../runtime/index.js');
    if (!runtime.isRunning(call.chatId)) runtime.run(call.chatId);
  }
  return saved;
}
