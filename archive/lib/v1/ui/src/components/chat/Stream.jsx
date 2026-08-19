import { Fragment } from 'react';
import { ToolCall } from './ToolCall.jsx';
import { Markdown } from './Markdown.jsx';
import { formatClock, textOf } from '../../format.js';

const MINUTE = 60000;

const reasoningText = (item) => {
  const summary = (item.summary ?? []).map((one) => one.text ?? '').join('');
  if (summary) return summary;
  const content = (item.content ?? []).map((one) => one.text ?? '').join('');
  return content || '已完成推理';
};

export function Stream({ items }) {
  const outputs = new Map(
    items.filter((row) => row.item.type === 'function_call_output').map((row) => [row.item.call_id, row.item]),
  );
  let lastTs = null;

  return (
    <>
      {items.map((row) => {
        const item = row.item;
        if (item.type === 'function_call_output') return null;

        let time = null;
        if (row.createdAt && (lastTs === null || row.createdAt - lastTs > 5 * MINUTE)) {
          lastTs = row.createdAt;
          time = <div className="timestamp">{formatClock(row.createdAt)}</div>;
        }

        if (item.type === 'function_call') {
          return (
            <Fragment key={row.id}>
              {time}
              <ToolCall call={item} output={outputs.get(item.call_id)} />
            </Fragment>
          );
        }

        if (item.type === 'reasoning') {
          return (
            <Fragment key={row.id}>
              {time}
              <details className="reasoning">
                <summary><span className="chevron">▶</span>思考过程</summary>
                <p>{reasoningText(item)}</p>
              </details>
            </Fragment>
          );
        }

        if (item.type !== 'message') return null;
        const role = item.role || 'assistant';
        const isRuntime = row.source === 'runtime';
        const isUser = role === 'user' && !isRuntime;
        const isDeveloper = role === 'developer';
        const text = textOf(item);
        if (isRuntime) {
          return (
            <Fragment key={row.id}>
              {time}
              <details className="runtime-message">
                <summary>
                  <span className="chevron">▶</span>
                  <span>执行对话返回</span>
                </summary>
                <div className="runtime-body markdown"><Markdown>{text}</Markdown></div>
              </details>
            </Fragment>
          );
        }
        return (
          <Fragment key={row.id}>
            {time}
            <div className={`message ${isUser ? 'user' : 'assistant'}${row.optimistic ? ' optimistic' : ''}`}>
              {isDeveloper && <div className="sender">上下文</div>}
              <div className={`bubble ${isUser || isDeveloper ? 'plain' : 'markdown'}`}>
                {isUser || isDeveloper ? text : <Markdown>{text}</Markdown>}
              </div>
            </div>
          </Fragment>
        );
      })}
    </>
  );
}
