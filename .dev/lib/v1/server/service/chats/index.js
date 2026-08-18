import { calls, chats, compactions, items } from '../../repository/index.js';
export { create } from './create.js';
export { message } from './message.js';
export { remove } from './remove.js';
export { stop } from './stop.js';
export const get = (id) => chats.get(id);
export const list = (options) => chats.list(options);
export const update = (id, changes) => chats.update(id, changes);
export const listItems = (id, options) => items.listByChat(id, options);
export const listCompactions = (id) => compactions.listByChat(id);
export const listCreated = (id) => {
  const history = calls.listByChat(id);
  return calls.createdChats(id).map((chat) => ({
    ...chat,
    callStatus: history.find((call) => call.toChatId === chat.id)?.status ?? null,
  }));
};
