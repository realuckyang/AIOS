import { useEffect, useState } from 'react';
import * as api from '../../api.js';
import { ChatDetail } from './ChatDetail.jsx';
import { ChatList } from './ChatList.jsx';

export function ChatPanel({ open, chats, calls, onClose }) {
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!open || !selectedId) { setDetail(null); setItems([]); return; }
    void Promise.all([api.getChat(selectedId), api.listItems(selectedId)])
      .then(([chat, rows]) => { setDetail(chat); setItems(rows); });
  }, [open, selectedId]);

  if (!open) return null;
  const call = calls.find((one) => one.toChatId === selectedId);

  return (
    <aside className="call-panel">
      <div className="panel-head">
        <b>执行对话</b>
        <span className="panel-count">{chats.length}</span>
        <button className="panel-close" onClick={onClose}>×</button>
      </div>
      <div className="panel-body">
        {selectedId ? (
          <ChatDetail
            detail={detail}
            items={items}
            call={call}
            onBack={() => setSelectedId('')}
          />
        ) : (
          <ChatList chats={chats} calls={calls} onSelect={setSelectedId} />
        )}
      </div>
    </aside>
  );
}
