// 轻量 History router:干净的 path,不带 #。
// 前端是静态构建产物,但 App 服务端对任何非文件、非 /api/ 的路径都回退到 index.html
// (见 app/index.js 的静态处理),所以刷新 / 直达 /chat/<id> 都能由 index.html 承载。
//
//   /            → 默认:新对话页
//   /new         → 新对话(draft)
//   /chat/<id>   → 具体对话(每个对话唯一 URL,刷新/重启后可恢复)
//   /app/<id>    → 应用视图(工具/Skills/待办/记忆… 全走这条:/app/tools、/app/memory)
//   /settings
import { useCallback, useEffect, useState } from 'react';

export type Route =
  | { name: 'chat'; id: string | null; draft: boolean }
  | { name: 'app'; id: string }
  | { name: 'settings' };

export function parsePath(pathname: string): Route {
  const parts = pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  if (parts[0] === 'chat' && parts[1]) return { name: 'chat', id: decodeURIComponent(parts[1]), draft: false };
  if (parts[0] === 'new') return { name: 'chat', id: null, draft: true };
  if (parts[0] === 'app' && parts[1]) return { name: 'app', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'settings') return { name: 'settings' };
  return { name: 'chat', id: null, draft: false }; // / → 新对话页
}

export function toPath(route: Route): string {
  switch (route.name) {
    case 'chat':
      return route.id ? `/chat/${encodeURIComponent(route.id)}` : route.draft ? '/new' : '/';
    case 'app':
      return `/app/${encodeURIComponent(route.id)}`;
    case 'settings':
      return '/settings';
  }
}

/** 构造 chat 路由。draft=true 表示「新对话」(id 必须为 null);draft=false 且无 id 表示默认(/)。 */
export function chatRoute(id: string | null, draft = false): Route {
  if (draft) return { name: 'chat', id: null, draft: true };
  if (id) return { name: 'chat', id, draft: false };
  return { name: 'chat', id: null, draft: false };
}

/** 跳到某 route。replace=true 时不产生历史记录(用于首次自动恢复等场景)。
 *  pushState/replaceState 都不触发 popstate,所以状态同步由 useRoute 的 go 主动做。 */
export function navigate(route: Route, replace = false): void {
  const target = toPath(route);
  if (location.pathname === target) return;
  if (replace) history.replaceState(null, '', target);
  else history.pushState(null, '', target);
}

/** 把当前 URL 指到某 route,不改动历史栈语义之外的东西(配合 location.reload 用)。 */
export function setRouteSilently(route: Route): void {
  const target = toPath(route);
  if (location.pathname !== target) history.replaceState(null, '', target);
}

/** 路由按值比较,避免「值没变但对象换了引用」引发多余重渲染 / 渲染死循环。 */
function sameRoute(a: Route, b: Route): boolean {
  if (a.name !== b.name) return false;
  if (a.name === 'chat' && b.name === 'chat') return a.id === b.id && a.draft === b.draft;
  if (a.name === 'app' && b.name === 'app') return a.id === b.id;
  return true; // settings 无参数
}

export function useRoute(): [Route, (route: Route, replace?: boolean) => void] {
  const [route, setRoute] = useState<Route>(() => parsePath(location.pathname));
  // 同步到真实 URL,但值没变就保持原引用 —— 否则依赖 route 的 effect 会被新对象反复唤醒。
  const sync = useCallback(() => setRoute((prev) => {
    const next = parsePath(location.pathname);
    return sameRoute(prev, next) ? prev : next;
  }), []);
  // popstate 只在浏览器前进/后退时触发;pushState/replaceState 不触发,由 go 主动 sync。
  useEffect(() => {
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [sync]);
  const go = useCallback((next: Route, replace = false) => {
    navigate(next, replace);
    sync();
  }, [sync]);
  return [route, go];
}
