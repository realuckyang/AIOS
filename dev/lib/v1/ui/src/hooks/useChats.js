import { useCallback, useEffect, useState } from 'react';
import * as api from '../api.js';

const byUpdated = (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0);

export function useChats() {
  const [chats, setChats] = useState([]);
  const refresh = useCallback(() => api.listChats('user').then((list) => setChats(list.sort(byUpdated))), []);
  useEffect(() => { void refresh(); }, [refresh]);
  const create = async (data = {}) => { const chat = await api.createChat(data); await refresh(); return chat; };
  const remove = async (id) => { await api.removeChat(id); await refresh(); };
  const apply = (event) => {
    if (event.type === 'gap') { void refresh(); return; }
    if (event.type === 'status') {
      setChats((list) => list.map((chat) => (
        chat.id === event.chatId ? { ...chat, status: event.status } : chat
      )));
      return;
    }
    if (event.chatId && (event.type === 'input' || (event.type === 'message' && event.item))) {
      setChats((list) => list.map((chat) => (
        chat.id === event.chatId
          ? { ...chat, updatedAt: event.at ?? Date.now() }
          : chat
      )).sort(byUpdated));
    }
  };
  return { chats, create, remove, refresh, apply };
}
