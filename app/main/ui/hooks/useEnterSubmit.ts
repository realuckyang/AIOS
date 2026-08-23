// Enter 提交、Shift+Enter 换行、输入法组合中不提交 —— 所有「回车即提交」的输入框走这一处。
//
// 为什么不能只看 isComposing:WKWebView(Tauri 在 macOS 用的 webview)里,用回车确认
// 候选词时 compositionend 会**先于**这次 keydown 触发,keydown 拿到的 isComposing 已是
// false —— 单靠它拦不住,中文回车就误发送了(Chromium 里则没这问题)。于是再叠两道兜底:
// keyCode===229(这一下被输入法吞掉)、以及「刚结束组合」的一小段时间窗。
import { useCallback, useRef } from 'react';

export function useEnterSubmit(onSubmit: () => void) {
  const composing = useRef(false);
  const endedAt = useRef(0);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    const ime = e.nativeEvent.isComposing
      || composing.current
      || e.nativeEvent.keyCode === 229
      || Date.now() - endedAt.current < 120;
    if (ime) return;
    e.preventDefault();
    onSubmit();
  }, [onSubmit]);

  const onCompositionStart = useCallback(() => { composing.current = true; }, []);
  const onCompositionEnd = useCallback(() => {
    composing.current = false;
    endedAt.current = Date.now();
  }, []);

  return { onKeyDown, onCompositionStart, onCompositionEnd };
}
