import { chats } from '../../repository/index.js';
import { clearError, stop } from '../runtime/index.js';
export function remove(chatId) {
  stop(chatId);
  clearError(chatId);
  chats.remove(chatId);
  return { removed: true };
}
