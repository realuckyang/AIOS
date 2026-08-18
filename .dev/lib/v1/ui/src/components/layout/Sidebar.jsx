import { Icon } from '../Icon.jsx';
import { formatRelative } from '../../format.js';

export function Sidebar({ chats, currentId, settingsActive, onSelect, onCreate, onRemove, onSettings, onToggleSidebar }) {
  return (
    <aside className="sidebar">
      <div className="window-row">
        <span className="brand">AGENT</span>
        <button className="sidebar-toggle" onClick={onToggleSidebar} title="收起侧边栏">
          <Icon name="panel" size={17} />
        </button>
      </div>
      <button className="sidebar-create" onClick={onCreate}>新对话</button>
      <nav className="chat-list">
        {chats.map((chat) => (
          <button
            key={chat.id}
            className={`chat-row${currentId === chat.id ? ' active' : ''}`}
            onClick={() => onSelect(chat.id)}
          >
            <span className="chat-title">
              {chat.status === 'running' && <i className="status-dot running" />}
              <b>{chat.title || '新对话'}</b>
            </span>
            <time>{formatRelative(chat.updatedAt)}</time>
            <span
              className="delete-chat"
              onClick={(event) => { event.stopPropagation(); onRemove(chat.id); }}
            >×</span>
          </button>
        ))}
        {!chats.length && <div className="panel-empty">还没有对话</div>}
      </nav>
      <button className={`account${settingsActive ? ' active' : ''}`} onClick={onSettings}>
        <span className="account-copy"><b>设置</b><small>127.0.0.1:9522</small></span>
        <span className="go">设置 ›</span>
      </button>
    </aside>
  );
}
