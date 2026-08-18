import { chats } from '../../repository/index.js';
import { publish } from '../events/index.js';
import { clearError } from './errors.js';
import { recover } from './recover.js';
import { execute } from './run.js';
export { clearError, errorOf } from './errors.js';

const running = new Map();
recover();

export function run(chatId) {
  if (running.has(chatId)) return false;
  const chat = chats.get(chatId);
  if (!chat) return false;
  clearError(chatId);
  const controller = new AbortController();
  running.set(chatId, controller);
  chats.updateStatus(chatId, 'running');
  publish({ type: 'status', chatId, status: 'running' });
  void execute(chat, controller).catch((cause) => console.error('[runtime]', cause)).finally(() => {
    running.delete(chatId);
    if (chats.get(chatId)) chats.updateStatus(chatId, 'idle');
    publish({ type: 'status', chatId, status: 'idle' });
  });
  return true;
}

export function stop(chatId) {
  const controller = running.get(chatId);
  if (!controller) return false;
  controller.abort();
  return true;
}

export const isRunning = (chatId) => running.has(chatId);
