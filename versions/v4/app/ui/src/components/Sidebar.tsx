// 左侧边栏:品牌 + 新对话/工具/Skills + 应用组 + 置顶组 + 最近组 + 设置。
// 每个对话行右侧有置顶切换与更多(重命名/删除)两个操作按钮。
//
// 组的语义:置顶组按置顶时间(新置顶在上),最近组永远按最后活跃;
// 应用组来自 src/apps 的构建期注册表(新建目录即上架)。
// 每个组都能收起,标题整行就是开关;收起是「我不常用这一类」的长期偏好,
// 记在 localStorage 跨启动保留。
import { memo, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import type { ChatMeta } from '../types';
import { apps } from '../apps';
import { Icon } from './Icon';
import { useEnterSubmit } from '../hooks/useEnterSubmit';

export type View = 'chat' | 'settings' | `app:${string}`;

interface SidebarProps {
  chats: ChatMeta[];
  currentId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onSettings: () => void;
  onApp: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  activeView: View;
}

function Group({ storageKey, label, children }: { storageKey: string; label: string; children: ReactNode }) {
  const [folded, setFolded] = useState(() => localStorage.getItem(storageKey) === '1');
  const toggle = () => setFolded((value) => {
    localStorage.setItem(storageKey, value ? '' : '1');
    return !value;
  });
  return (
    <div className="sidebar-group">
      <button className={`sidebar-group-title${folded ? ' folded' : ''}`} onClick={toggle}>
        <span>{label}</span>
        <i className="sidebar-chevron" />
      </button>
      {!folded && children}
    </div>
  );
}

export const Sidebar = memo(function Sidebar({
  chats, currentId, onOpen, onNew, onSettings, onApp,
  onPin, onRename, onDelete, activeView,
}: SidebarProps) {
  const pinned = chats.filter((chat) => chat.pinned_at)
    .sort((a, b) => (b.pinned_at ?? '').localeCompare(a.pinned_at ?? ''));
  const recent = chats.filter((chat) => !chat.pinned_at);

  // 行内更多菜单:fixed 定位逃出列表 overflow 的裁剪。
  // 菜单渲染在侧栏顶层而不是行内,定宽、不用 transform 对齐 ——
  // 内联 transform 会和 .menu 的 pop-in 动画(它也动画 transform)打架。
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState<ChatMeta | null>(null);
  const [deleting, setDeleting] = useState<ChatMeta | null>(null);
  const [draft, setDraft] = useState('');

  const ROW_MENU_WIDTH = 160;
  const openMenu = (id: string, e: ReactMouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ x: Math.max(8, rect.right - ROW_MENU_WIDTH), y: rect.bottom + 6 });
    setRowMenu((current) => (current === id ? null : id));
  };

  const confirmRename = () => {
    const next = draft.trim();
    if (editing && next && next !== (editing.title || '')) onRename(editing.id, next);
    setEditing(null);
    setDraft('');
  };
  const enter = useEnterSubmit(confirmRename);

  const row = (chat: ChatMeta) => {
    const isPinned = !!chat.pinned_at;
    const menuOpen = rowMenu === chat.id;
    return (
      <li key={chat.id} className={chat.id === currentId ? 'active' : ''} onClick={() => onOpen(chat.id)}>
        <button type="button" className="row-title" onClick={() => onOpen(chat.id)} title={chat.title || chat.id}>
          {chat.status === 'running' && <span className="s running" title="运行中" />}
          <span className="t">{chat.title || chat.id}</span>
        </button>
        <span className="row-actions">
          <button
            type="button"
            className={`icon-btn row-btn${isPinned ? ' on' : ''}`}
            title={isPinned ? '取消置顶' : '置顶'}
            aria-label={isPinned ? '取消置顶' : '置顶'}
            onClick={(e) => { e.stopPropagation(); onPin(chat.id, !isPinned); }}
          >
            <Icon name="pin" size={13} />
          </button>
          <button
            type="button"
            className={`icon-btn row-btn${menuOpen ? ' on' : ''}`}
            title="更多"
            aria-label="更多"
            onClick={(e) => { e.stopPropagation(); openMenu(chat.id, e); }}
          >
            <Icon name="more" size={13} />
          </button>
        </span>
      </li>
    );
  };

  const menuChat = rowMenu ? chats.find((one) => one.id === rowMenu) : null;

  return (
    <aside id="sidebar">
      <header id="sidebar-brand"><span className="brand">AIOS</span></header>
      {/* 功能区:新对话(创建)+ 所有视图,平铺一列。工具/Skills/待办… 全来自 apps 注册表,
          没有硬编码特例;agent 造新功能就是往这条列表加一行。 */}
      <nav id="sidebar-functions" aria-label="功能">
        <button className={activeView === 'chat' && !currentId ? 'active' : ''} onClick={onNew}>
          <Icon name="plus" size={15} /><span>新对话</span>
        </button>
        {apps.map((app) => (
          <button
            key={app.id}
            className={activeView === `app:${app.id}` ? 'active' : ''}
            title={app.description}
            onClick={() => onApp(app.id)}
          >
            <Icon name={app.icon} size={15} /><span>{app.name}</span>
          </button>
        ))}
      </nav>
      <section id="sidebar-history">
        {pinned.length > 0 && (
          <Group storageKey="aios.sidebar.pinned-folded" label="置顶">
            <ul className="chat-list">{pinned.map(row)}</ul>
          </Group>
        )}
        <Group storageKey="aios.sidebar.recent-folded" label="最近">
          <ul className="chat-list">{recent.map(row)}</ul>
        </Group>
      </section>
      <footer id="sidebar-footer">
        <button id="open-settings" className={activeView === 'settings' ? 'active' : ''} onClick={onSettings}>
          <Icon name="settings" size={15} /><span>设置</span>
        </button>
      </footer>

      {menuChat && menuPos && (
        <>
          <span className="menu-backdrop" onClick={() => setRowMenu(null)} />
          <div className="menu row-menu" role="menu" style={{ position: 'fixed', left: menuPos.x, top: menuPos.y, width: ROW_MENU_WIDTH }}>
            <button onClick={() => { setRowMenu(null); onPin(menuChat.id, !menuChat.pinned_at); }}>
              <Icon name="pin" size={14} /><span>{menuChat.pinned_at ? '取消置顶' : '置顶'}</span>
            </button>
            <button onClick={() => { setRowMenu(null); setEditing(menuChat); setDraft(menuChat.title || ''); }}>
              <Icon name="pencil" size={14} /><span>重命名</span>
            </button>
            <button className="danger" onClick={() => { setRowMenu(null); setDeleting(menuChat); }}>
              <Icon name="trash" size={14} /><span>删除</span>
            </button>
          </div>
        </>
      )}

      {editing && (
        <div className="modal-mask" role="dialog" aria-modal="true" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">重命名对话</h2>
            <input
              className="input"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onCompositionStart={enter.onCompositionStart}
              onCompositionEnd={enter.onCompositionEnd}
              onKeyDown={(e) => {
                enter.onKeyDown(e);
                if (e.key === 'Escape') setEditing(null);
              }}
            />
            <div className="modal-foot">
              <button className="btn btn-plain" onClick={() => setEditing(null)}>取消</button>
              <button className="btn btn-primary" disabled={!draft.trim()} onClick={confirmRename}>确定</button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="modal-mask" role="dialog" aria-modal="true" onClick={() => setDeleting(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">删除这条对话?</h2>
            <p className="modal-text">「{deleting.title || deleting.id}」将被删除,无法恢复。</p>
            <div className="modal-foot">
              <button className="btn btn-plain" autoFocus onClick={() => setDeleting(null)}>取消</button>
              <button className="btn btn-danger" onClick={() => { const id = deleting.id; setDeleting(null); onDelete(id); }}>删除</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
});
