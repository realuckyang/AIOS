import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useAios } from './hooks/useAios';
import { apps, appView } from './apps';
import { Sidebar, type View } from './components/Sidebar';
import { ChatHeader } from './components/ChatHeader';
import { Thread } from './components/Thread';
import { Composer, type ComposerSeed } from './components/Composer';
import { StatusLine } from './components/StatusLine';
import { Settings } from './components/Settings';
import { Skills } from './components/Skills';
import { Tools } from './components/Tools';
import { RestartModal } from './components/RestartModal';
import { chatRoute, useHashRoute, type Route } from './router';

const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

function AppHost({ id }: { id: string }) {
  const Body = appView(id);
  if (!Body) return <div className="app-missing">应用不存在: {id}</div>;
  return <Suspense fallback={null}><Body /></Suspense>;
}

/** Sidebar 的 activeView 用的是 'chat' | 'settings' | ... | `app:${string}` 字符串,从 route 转出来 */
function routeToView(route: Route): View {
  if (route.name === 'chat') return 'chat';
  if (route.name === 'app') return `app:${route.id}`;
  return route.name;
}

export default function App() {
  const aios = useAios();
  const [route, navigate] = useHashRoute();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [seed, setSeed] = useState<ComposerSeed | null>(null);
  const onStarter = useCallback((text: string) => {
    setSeed((current) => ({ text, n: (current?.n ?? 0) + 1 }));
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isMobile()) setSidebarOpen((v) => !v);
    else setSidebarCollapsed((v) => !v);
  }, []);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // 跨断点时清掉另一套状态的残留 class,避免 PC/移动端规则打架
  const onResizeRef = useRef(() => {
    if (isMobile()) setSidebarCollapsed(false);
    else setSidebarOpen(false);
  });
  useEffect(() => {
    const handler = () => onResizeRef.current();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ── URL → 对话状态 ──
  // chat 视图且指定 id:打开它;draft(#/new):切到新对话。
  // 空 hash(#/)的默认打开由下面「首个对话」effect 处理,这里不碰。
  useEffect(() => {
    if (route.name !== 'chat') return;
    if (route.id) {
      if (aios.currentId !== route.id) aios.openChat(route.id);
    } else if (route.draft && aios.currentId !== null) {
      aios.draft();
    }
  }, [route, aios]);

  // 空 hash 且无明确目标:恢复旧行为,自动打开第一个对话(replace 掉空 URL)
  useEffect(() => {
    if (route.name === 'chat' && !route.draft && !aios.currentId && aios.chats.length > 0) {
      const first = aios.chats[0].id;
      navigate(chatRoute(first), true);
    }
  }, [route, aios, navigate]);

  // 对话状态 → URL:draft 里新建了对话(发首条消息)后,把 URL 指过去
  useEffect(() => {
    if (route.name === 'chat' && !route.id && aios.currentId) {
      navigate(chatRoute(aios.currentId));
    }
  }, [aios.currentId, route, navigate]);

  // 对话被删后,若 URL 仍指向它,退回新对话
  useEffect(() => {
    if (route.name === 'chat' && route.id && aios.chats.length && !aios.chats.some((c) => c.id === route.id)) {
      navigate(chatRoute(null, true));
    }
  }, [route, aios.chats, navigate]);

  const appId = route.name === 'app' ? route.id : null;
  const title = appId
    ? (apps.find((one) => one.id === appId)?.name ?? appId)
    : route.name === 'settings' ? '设置' : route.name === 'tools' ? '工具' : route.name === 'skills' ? 'Skills' : (aios.meta ? aios.meta.title || aios.currentId || '新对话' : '新对话');
  const bodyClass = [sidebarOpen ? 'sidebar-open' : '', sidebarCollapsed ? 'sidebar-collapsed' : '']
    .filter(Boolean)
    .join(' ');
  const busy = route.name === 'chat' && aios.meta?.status === 'running';

  const backToChat = () => {
    navigate(aios.currentId ? chatRoute(aios.currentId) : chatRoute(null, true));
  };

  return (
    <div id="app" className={bodyClass}>
      <Sidebar
        chats={aios.chats}
        currentId={route.name === 'chat' ? aios.currentId : null}
        onOpen={(id) => { navigate(chatRoute(id)); }}
        onNew={() => { navigate(chatRoute(null, true)); }}
        onTools={() => { navigate({ name: 'tools' }); closeSidebar(); }}
        onSkills={() => { navigate({ name: 'skills' }); closeSidebar(); }}
        onSettings={() => { route.name === 'settings' ? backToChat() : navigate({ name: 'settings' }); closeSidebar(); }}
        onApp={(id) => { navigate({ name: 'app', id }); closeSidebar(); }}
        onPin={aios.pin}
        onRename={aios.rename}
        onDelete={aios.remove}
        activeView={routeToView(route)}
      />
      <div id="overlay" onClick={closeSidebar} />
      <main id="workspace">
        <ChatHeader
          title={title}
          hasChat={route.name === 'chat' && !!aios.currentId}
          pinned={!!aios.meta?.pinned_at}
          onToggleSidebar={toggleSidebar}
          onPin={(p) => { if (aios.currentId) aios.pin(aios.currentId, p); }}
          onRename={(t) => { if (aios.currentId) aios.rename(aios.currentId, t); }}
          onDelete={aios.remove}
        />
        {appId ? <AppHost key={appId} id={appId} /> : route.name === 'settings' ? <Settings /> : route.name === 'tools' ? <Tools /> : route.name === 'skills' ? <Skills /> : (
          <>
            <Thread
              key={aios.currentId ?? 'draft'}
              items={aios.items}
              contextStart={aios.meta?.context_start ?? 0}
              streams={aios.streams}
              busy={busy}
              errors={aios.errors}
              onDismissError={aios.dismissError}
              hasMore={aios.hasMore}
              loadingMore={aios.loadingMore}
              onLoadMore={aios.loadMore}
              onStarter={onStarter}
            />
            <Composer onSend={aios.send} busy={busy} onStop={aios.stop} seed={seed} />
            <StatusLine items={aios.items} meta={aios.meta} />
          </>
        )}
      </main>
      <RestartModal />
    </div>
  );
}
