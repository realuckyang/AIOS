// 应用状态中枢:chats 列表、当前对话、items、流式增量、动作。
// 事件处理与动作都放在这里,组件只负责渲染。
import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api';
import type { ChatMeta, Row } from '../types';
import { useEvents } from './useEvents';

export interface Streams {
  message: string;
  reasoning: string;
}

export interface ErrorBanner {
  id: number;
  message: string;
}

const PAGE_SIZE = 50;
const mergeRows = (left: Row[], right: Row[]) => [...new Map([...left, ...right].map((row) => [row.seq, row])).values()]
  .sort((a, b) => a.seq - b.seq);

export function useAios() {
  const [chats, setChats] = useState<ChatMeta[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [meta, setMeta] = useState<ChatMeta | null>(null);
  const [items, setItems] = useState<Row[]>([]);
  const [streams, setStreams] = useState<Streams>({ message: '', reasoning: '' });
  const [errors, setErrors] = useState<ErrorBanner[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const errSeq = useRef(0);

  const refreshChats = useCallback(async () => {
    try {
      setChats(await api.listChats());
    } catch (e) {
      setErrors((prev) => [...prev, { id: ++errSeq.current, message: `对话列表加载失败: ${(e as Error).message}` }]);
    }
  }, []);

  const openChat = useCallback(async (id: string) => {
    setCurrentId(id);
    setStreams({ message: '', reasoning: '' });
    setErrors([]);
    try {
      const [m, page] = await Promise.all([api.getChat(id), api.listItemsPage(id, undefined, PAGE_SIZE)]);
      setMeta(m);
      setItems(page.items);
      setHasMore(page.hasMore);
    } catch (e) {
      setErrors((prev) => [...prev, { id: ++errSeq.current, message: `对话加载失败: ${(e as Error).message}` }]);
    }
  }, []);

  const draft = useCallback(() => {
    setCurrentId(null);
    setMeta(null);
    setItems([]);
    setStreams({ message: '', reasoning: '' });
    setErrors([]);
    setHasMore(false);
  }, []);

  const loadMore = useCallback(async () => {
    if (!currentId || loadingMore || !hasMore || !items.length) return;
    setLoadingMore(true);
    try {
      const page = await api.listItemsPage(currentId, items[0].seq, PAGE_SIZE);
      setItems((current) => mergeRows(page.items, current));
      setHasMore(page.hasMore);
    } catch (e) {
      setErrors((prev) => [...prev, { id: ++errSeq.current, message: `历史记录加载失败: ${(e as Error).message}` }]);
    } finally {
      setLoadingMore(false);
    }
  }, [currentId, loadingMore, hasMore, items]);

  // 草稿发首条消息会新建对话:返回新对话 id,交给上层把 URL 指过去(显式,不靠反应式 effect 猜)。
  const send = useCallback(
    async (text: string, images?: string[]): Promise<string | undefined> => {
      const content = text.trim();
      if (!content && !images?.length) return undefined;
      if (!currentId) {
        try {
          const chat = await api.createChat({
            title: content.slice(0, 24) || '图片',
            message: { content, source: 'user', ...(images?.length ? { images } : {}) },
          });
          await refreshChats();
          await openChat(chat.id);
          return chat.id;
        } catch (e) {
          setErrors((prev) => [...prev, { id: ++errSeq.current, message: `发送失败: ${(e as Error).message}` }]);
        }
      } else {
        try {
          await api.sendMessage(currentId, content, 'user', images);
        } catch (e) {
          setErrors((prev) => [...prev, { id: ++errSeq.current, message: `发送失败: ${(e as Error).message}` }]);
        }
      }
      return undefined;
    },
    [currentId, refreshChats, openChat],
  );

  const stop = useCallback(async () => {
    if (currentId) {
      try {
        await api.stopChat(currentId);
      } catch { /* 停止失败时忽略 */ }
    }
  }, [currentId]);

  // 确认交给界面自己的弹层,这里只管执行;不传 id 时删除当前对话
  const remove = useCallback(async (id?: string) => {
    const target = id ?? currentId;
    if (!target) return;
    try {
      await api.deleteChat(target);
      await refreshChats();
      if (target === currentId) draft();
    } catch (e) {
      setErrors((prev) => [...prev, { id: ++errSeq.current, message: `删除失败: ${(e as Error).message}` }]);
    }
  }, [currentId, refreshChats, draft]);

  const dismissError = useCallback((id: number) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const rename = useCallback(
    async (id: string, title: string) => {
      const t = title.trim();
      if (!t) return;
      try {
        await api.patchChat(id, { title: t });
        await refreshChats();
        if (id === currentId) setMeta((m) => (m ? { ...m, title: t } : m));
      } catch (e) {
        setErrors((prev) => [...prev, { id: ++errSeq.current, message: `重命名失败: ${(e as Error).message}` }]);
      }
    },
    [currentId, refreshChats],
  );

  const pin = useCallback(
    async (id: string, pinned: boolean) => {
      try {
        const updated = await api.patchChat(id, { pinned });
        await refreshChats();
        if (id === currentId) setMeta(updated);
      } catch (e) {
        setErrors((prev) => [...prev, { id: ++errSeq.current, message: `置顶失败: ${(e as Error).message}` }]);
      }
    },
    [currentId, refreshChats],
  );

  // 处理 SSE 事件
  useEvents(
    useCallback(
      (event) => {
        const { type, data } = event as { type: string; data: any };
        const d = data ?? {};
        const touching = d.threadId === undefined || d.threadId === currentId;

        switch (type) {
          case 'status':
            if (d.threadId === currentId) setMeta((m) => (m ? { ...m, status: d.status } : m));
            refreshChats();
            break;
          case 'input':
            if (touching && d.row) setItems((prev) => [...prev, d.row]);
            break;
          case 'message':
            if (touching) {
              if (d.delta) setStreams((s) => ({ ...s, message: s.message + d.delta }));
              // 定稿行到达即清空该段流式缓冲,避免和落库文本重复显示
              if (d.row) {
                setItems((prev) => [...prev, d.row]);
                setStreams((s) => ({ ...s, message: '' }));
              }
            }
            break;
          case 'reasoning':
            if (touching) {
              if (d.delta) setStreams((s) => ({ ...s, reasoning: s.reasoning + d.delta }));
              if (d.row) {
                setItems((prev) => [...prev, d.row]);
                setStreams((s) => ({ ...s, reasoning: '' }));
              }
            }
            break;
          case 'tool_calls':
          case 'tool_results':
            if (touching && d.row) setItems((prev) => [...prev, d.row]);
            break;
          case 'done':
            if (d.threadId === currentId) {
              setStreams({ message: '', reasoning: '' });
              // 不重拉 items:每条定稿行内核都已通过 item 事件送达(见 kernel/loop.js),
              // items 此刻已是完整权威;漏事件由 gap 事件兜底重载。这里重拉只会换掉行对象
              // 引用逼整页重渲染,和收尾时的布局折叠撞在一起,造成消息「删一下」。
              // 只刷 meta 带回 usage 聚合。
              api.getChat(d.threadId).then(setMeta).catch(() => {});
            }
            refreshChats();
            break;
          case 'error':
            if (touching) {
              setErrors((prev) => [...prev, { id: ++errSeq.current, message: d.message || '发生错误' }]);
            }
            break;
          case 'gap':
            refreshChats();
            if (currentId) openChat(currentId);
            break;
        }
      },
      [currentId, refreshChats, openChat],
    ),
  );

  // 初次加载:只拉列表。打开哪个对话由 App 按当前 URL(route)决定,
  // 否则刷新/重启后永远被"第一个对话"抢走,无法回到原位置。
  useEffect(() => {
    let cancelled = false;
    refreshChats().finally(() => { if (cancelled) return; });
    return () => {
      cancelled = true;
    };
  }, [refreshChats]);

  return { chats, currentId, meta, items, streams, errors, hasMore, loadingMore, loadMore, refreshChats, openChat, draft, send, stop, remove, rename, pin, dismissError };
}
