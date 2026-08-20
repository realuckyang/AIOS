// SSE 订阅。与内核事件一一对应,断线重连交给 EventSource 自动处理。
import { useEffect, useRef } from 'react';
import type { AiosEvent } from '../types';

export type EventHandler = (event: AiosEvent) => void;

export function useEvents(onEvent: EventHandler) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const es = new EventSource('/api/events');
    const on = (type: AiosEvent['type']) => (e: MessageEvent) => {
      let data: unknown;
      try {
        data = e.data ? JSON.parse(e.data) : undefined;
      } catch {
        data = undefined;
      }
      handlerRef.current({ type, data } as AiosEvent);
    };
    for (const type of ['status', 'input', 'reasoning', 'message', 'tool_calls', 'tool_results', 'done', 'error', 'gap'] as const) {
      es.addEventListener(type, on(type));
    }
    return () => es.close();
  }, []);
}
