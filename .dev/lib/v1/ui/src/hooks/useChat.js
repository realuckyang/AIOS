import { useCallback, useEffect, useState } from 'react';
import * as api from '../api.js';

const rowOf = (event) => ({
  id: event.itemId,
  item: event.item,
  source: event.source,
  usage: event.usage ?? null,
  createdAt: event.at ?? Date.now(),
});

export function useChat(chatId) {
  const [chat, setChat] = useState(null);
  const [items, setItems] = useState([]);
  const [messageDelta, setMessageDelta] = useState('');
  const [reasoningDelta, setReasoningDelta] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    if (!chatId) { setChat(null); setItems([]); return; }
    const [nextChat, nextItems] = await Promise.all([api.getChat(chatId), api.listItems(chatId)]);
    setChat(nextChat); setItems(nextItems); setError(nextChat.error || '');
    setMessageDelta(''); setReasoningDelta('');
  }, [chatId]);
  useEffect(() => { void refresh(); }, [refresh]);

  const add = (row) => setItems((list) => list.some((one) => one.id === row.id) ? list : [...list, row]);
  const apply = (event) => {
    if (event.type === 'gap') { void refresh(); return; }
    if (event.chatId !== chatId) return;
    if (event.type === 'status') {
      setChat((one) => one && ({ ...one, status: event.status }));
      if (event.status === 'running') setError('');
    }
    else if (event.type === 'input') add(rowOf(event));
    else if (event.type === 'message' || event.type === 'reasoning') {
      if (event.delta !== undefined) {
        const setter = event.type === 'message' ? setMessageDelta : setReasoningDelta;
        setter((text) => text + event.delta);
      } else if (event.item) {
        add(rowOf(event));
        if (event.type === 'message') setMessageDelta(''); else setReasoningDelta('');
      }
    } else if (event.type === 'tool_calls' || event.type === 'tool_results') {
      for (const row of event.items ?? []) {
        add({
          id: row.itemId, item: row.item, source: row.source,
          usage: null, createdAt: event.at ?? Date.now(),
        });
      }
    } else if (event.type === 'error') setError(event.message);
    else if (event.type === 'done') { setMessageDelta(''); setReasoningDelta(''); }
    else if (event.type === 'compaction') setChat((one) => one && ({
      ...one, compactions: [...(one.compactions ?? []), event.compaction],
    }));
  };

  const send = async (content) => {
    setError('');
    const temp = -Date.now();
    add({
      id: temp, item: { type: 'message', role: 'user', content }, source: 'user',
      optimistic: true, createdAt: Date.now(),
    });
    try {
      const result = await api.sendMessage(chatId, content);
      setItems((list) => {
        if (list.some((one) => one.id === result.itemId)) return list.filter((one) => one.id !== temp);
        return list.map((one) => one.id === temp ? { ...one, id: result.itemId, optimistic: false } : one);
      });
    } catch (cause) {
      setItems((list) => list.filter((one) => one.id !== temp));
      setError(cause.message);
    }
  };

  return { chat, items, messageDelta, reasoningDelta, error, send, stop: () => api.stopChat(chatId), apply, refresh };
}
