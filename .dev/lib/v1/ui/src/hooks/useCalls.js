import { useCallback, useEffect, useState } from 'react';
import * as api from '../api.js';

export function useCalls(chatId) {
  const [chats, setChats] = useState([]);
  const [calls, setCalls] = useState([]);
  const refresh = useCallback(async () => {
    if (!chatId) { setChats([]); setCalls([]); return; }
    const [targets, history] = await Promise.all([api.listCreatedChats(chatId), api.listCalls(chatId)]);
    setChats(targets); setCalls(history);
  }, [chatId]);
  useEffect(() => { void refresh(); }, [refresh]);
  const apply = (event) => {
    if (event.type === 'gap') void refresh();
    else if (event.type === 'call' && event.chatId === chatId) void refresh();
    else if (event.type === 'status') setChats((list) => list.map((chat) => (
      chat.id === event.chatId ? { ...chat, status: event.status } : chat
    )));
  };
  return { chats, calls, apply, refresh };
}
