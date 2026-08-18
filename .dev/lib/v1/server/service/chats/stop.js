import { stop as stopRuntime } from '../runtime/index.js';
export const stop = (chatId) => ({ stopped: stopRuntime(chatId) });
