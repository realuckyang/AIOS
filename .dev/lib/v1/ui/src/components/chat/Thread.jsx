import { useEffect, useRef } from 'react';
import { Compaction } from './Compaction.jsx';
import { Stream } from './Stream.jsx';

export function Thread({ chat, items, messageDelta, reasoningDelta, error }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [items, messageDelta, reasoningDelta]);

  return (
    <main className="thread" ref={ref}>
      <div className="thread-inner">
        {!items.length && chat?.status !== 'running' && (
          <div className="welcome">
            <div className="welcome-mark">✦</div>
            <h2>今天想完成什么？</h2>
            <p>描述一个目标，Agent 会读取项目、执行命令并验证结果。</p>
          </div>
        )}
        {(chat?.compactions ?? []).map((one) => <Compaction key={one.id} compaction={one} />)}
        <Stream items={items} />
        {reasoningDelta && (
          <details className="reasoning" open>
            <summary><span className="chevron">▶</span>思考过程</summary>
            <p>{reasoningDelta}</p>
          </details>
        )}
        {messageDelta && (
          <div className="message assistant live">
            <div className="bubble">{messageDelta}<i className="cursor" /></div>
          </div>
        )}
        {chat?.status === 'running' && !messageDelta && <div className="thinking"><i /><i /><i /></div>}
        {error && <div className="error-banner">{error}</div>}
      </div>
    </main>
  );
}
