import { Stream } from '../chat/Stream.jsx';
import { formatClock } from '../../format.js';

export function ChatDetail({ detail, items, call, onBack }) {
  if (!detail) return null;
  const status = call?.status || detail.status;
  return (
    <div className="target-detail">
      <button className="back" onClick={onBack}>‹ 返回</button>
      <div className="target-title">
        <h3>{detail.title || '执行对话'}</h3>
        <span className={`chip ${status}`}>{status}</span>
      </div>
      <div className="target-meta">
        调用 {call?.id ?? '—'}
        {call?.createdAt ? ` · 创建于 ${formatClock(call.createdAt)}` : ''}
        {call?.completedAt ? ` · 完成于 ${formatClock(call.completedAt)}` : ''}
      </div>
      <div className="target-stream"><Stream items={items} /></div>
    </div>
  );
}
