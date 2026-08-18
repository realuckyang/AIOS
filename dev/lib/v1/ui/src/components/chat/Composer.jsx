import { useRef, useState } from 'react';
import { Usage } from './Usage.jsx';

export function Composer({ running, items, onSend, onStop, placeholder = '交给 Agent 一个任务' }) {
  const [value, setValue] = useState('');
  const taRef = useRef(null);

  const resize = (element) => {
    const el = element || taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    setValue('');
    if (taRef.current) taRef.current.style.height = 'auto';
    void onSend(text);
  };

  const keyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const textarea = (
    <textarea
      ref={taRef}
      value={value}
      rows={1}
      placeholder={placeholder}
      onChange={(event) => { setValue(event.target.value); resize(event.currentTarget); }}
      onKeyDown={keyDown}
    />
  );

  return (
    <div className="composer-wrap">
      <div className="composer">
        {textarea}
        {running
          ? <button className="stop-button" title="停止" onClick={onStop}>■</button>
          : <button className="send-button" title="发送" disabled={!value.trim()} onClick={submit}>↑</button>}
      </div>
      <div className="composer-meta">
        <span>Enter 发送 · Shift+Enter 换行</span>
        <Usage items={items} />
      </div>
    </div>
  );
}
