export function Compaction({ compaction }) {
  return (
    <details className="compaction">
      <summary>
        <span className="chevron">▶</span>较早上下文已压缩
        <span className="range">items {compaction.startItemId}–{compaction.endItemId}</span>
      </summary>
      <p>{compaction.text}</p>
    </details>
  );
}
