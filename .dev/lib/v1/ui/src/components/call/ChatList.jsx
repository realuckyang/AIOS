import { formatRelative } from '../../format.js';

const stateClass = (status) => ({ running: 'running', completed: 'completed', failed: 'failed', cancelled: 'cancelled' }[status] ?? '');

export function ChatList({ chats, calls, onSelect }) {
  return (
    <div className="target-list">
      {chats.map((chat) => {
        const call = calls.find((one) => one.toChatId === chat.id);
        const status = call?.status || chat.status;
        return (
          <button key={chat.id} className="target-row" onClick={() => onSelect(chat.id)}>
            <i className={`status-dot ${stateClass(status)}`} />
            <span className="target-copy">
              <b>{chat.title || '执行对话'}</b>
              <small><span className={`call-state ${stateClass(status)}`}>{status}</span> · {formatRelative(chat.updatedAt)}</small>
              {status === 'failed' && <span className="call-error">运行失败</span>}
            </span>
            <em>›</em>
          </button>
        );
      })}
      {!chats.length && <div className="panel-empty">还没有创建执行对话</div>}
    </div>
  );
}
