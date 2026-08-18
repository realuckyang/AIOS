import { useState } from 'react';

export function ToolCall({ call, output }) {
  let args = {};
  try { args = JSON.parse(call.arguments || '{}'); } catch { /* 参数坏掉也不影响展示 */ }
  const command = args.command || '';
  const summary = args.summary || '运行命令';
  const busy = !output;
  const [open, setOpen] = useState(false);
  const result = output?.output ?? '';

  return (
    <details className="tool-card" open={open} onToggle={(event) => setOpen(event.target.open)}>
      <summary className="tool-head">
        <span className="chevron">▶</span>
        <span className="tool-name">bash</span>
        <b>{summary}</b>
        <span className={`tool-state ${busy ? 'busy' : 'ok'}`}>{busy ? '执行中' : '完成'}</span>
      </summary>
      <code>{command}</code>
      {!busy && <pre className={result ? '' : 'empty'}>{result || '无输出'}</pre>}
    </details>
  );
}
