import { Icon } from '../Icon.jsx';

export function Header({ chat, panelOpen, sidebarOpen, onTogglePanel, onToggleSidebar }) {
  return (
    <header className="header">
      <div className="peer">
        {!sidebarOpen && (
          <button className="sidebar-toggle header-toggle" onClick={onToggleSidebar} title="展开侧边栏">
            <Icon name="panel" size={17} />
          </button>
        )}
        <h1>{chat?.title || '新对话'}</h1>
      </div>
      <div className="header-actions">
        <button
          className={`sidebar-toggle header-toggle panel-sidebar-toggle${panelOpen ? ' active' : ''}`}
          onClick={onTogglePanel}
          title={panelOpen ? '收起执行对话侧栏' : '展开执行对话侧栏'}
          aria-label={panelOpen ? '收起执行对话侧栏' : '展开执行对话侧栏'}
          aria-pressed={panelOpen}
        >
          <Icon name="panel" size={17} />
        </button>
      </div>
    </header>
  );
}
