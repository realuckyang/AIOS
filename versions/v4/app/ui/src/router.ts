// 轻量 hash router:让每个页面有唯一可分享/可恢复的 path。
// 用 hash 而不是 history API,因为 UI 是纯静态构建产物,
// 任何路径(刷新/重启/直接访问)都能由 index.html 承载,无需服务端 rewrite。
//
//   #/            → 默认:新对话(由 App 决定打开第一个对话)
//   #/new         → 新对话(draft)
//   #/chat/<id>   → 具体对话(每个对话唯一 URL,刷新/重启后可恢复)
//   #/app/<id>    → 应用视图(如 #/app/memory)
//   #/settings    → 设置
//   #/tools       → 工具
//   #/skills      → Skills
import { useCallback, useEffect, useState } from 'react';

export type Route =
  | { name: 'chat'; id: string | null; draft: boolean }
  | { name: 'app'; id: string }
  | { name: 'settings' }
  | { name: 'tools' }
  | { name: 'skills' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'chat' && parts[1]) return { name: 'chat', id: decodeURIComponent(parts[1]), draft: false };
  if (parts[0] === 'chat' || parts[0] === 'new') return { name: 'chat', id: null, draft: true };
  if (parts[0] === 'app' && parts[1]) return { name: 'app', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'settings') return { name: 'settings' };
  if (parts[0] === 'tools') return { name: 'tools' };
  if (parts[0] === 'skills') return { name: 'skills' };
  // 空 hash 或未知:默认新对话,App 会决定打开第一个
  return { name: 'chat', id: null, draft: false };
}

export function toHash(route: Route): string {
  switch (route.name) {
    case 'chat':
      return route.id ? `#/chat/${encodeURIComponent(route.id)}` : '#/new';
    case 'app':
      return `#/app/${encodeURIComponent(route.id)}`;
    case 'settings':
      return '#/settings';
    case 'tools':
      return '#/tools';
    case 'skills':
      return '#/skills';
  }
}

/** 构造 chat 路由。draft=true 表示「新对话」(id 必须为 null);draft=false 且无 id 表示「默认态」(空 hash,由 App 决定打开第一个)。 */
export function chatRoute(id: string | null, draft = false): Route {
  if (draft) return { name: 'chat', id: null, draft: true };
  if (id) return { name: 'chat', id, draft: false };
  return { name: 'chat', id: null, draft: false };
}

/** 跳到某 route。replace=true 时不产生历史记录(用于首次自动恢复等场景)。 */
export function navigate(route: Route, replace = false): void {
  const target = toHash(route);
  if (location.hash === target) return;
  if (replace) history.replaceState(null, '', target);
  else location.hash = target;
}

/** 把当前 hash 指到某 route;不触发 hashchange(配合 location.reload 用)。 */
export function setHashSilently(route: Route): void {
  const target = toHash(route);
  if (location.hash !== target) history.replaceState(null, '', target);
}

export function useHashRoute(): [Route, (route: Route, replace?: boolean) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  useEffect(() => {
    const onHash = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const go = useCallback((next: Route, replace = false) => navigate(next, replace), []);
  return [route, go];
}
