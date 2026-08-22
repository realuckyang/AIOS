// 工具目录:单列卡片列表,点进详情,返回回列表。布局与 Skills 页同一套 catalog。
import { useEffect, useState } from 'react';
import * as api from '../../api';
import type { ToolDetail, ToolSummary } from '../../types';
import { Icon } from '../../components/Icon';

export default function Tools() {
  const [tools, setTools] = useState<ToolSummary[]>([]);
  const [selected, setSelected] = useState<ToolDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listTools().then(setTools).catch((e: Error) => setError(e.message));
  }, []);

  const open = (name: string) => {
    setError('');
    api.getTool(name).then(setSelected).catch((e: Error) => setError(e.message));
  };

  return (
    <section className="catalog">
      <div className="catalog-inner">
        {error && <p className="settings-error">{error}</p>}

        {selected ? (
          <>
            <button className="catalog-back" onClick={() => setSelected(null)}>
              <Icon name="back" size={14} /><span>工具</span>
            </button>
            <article className="catalog-detail">
              <header>
                <h2>{selected.name}</h2>
                <code>{selected.exec}</code>
                {selected.description && <p>{selected.description}</p>}
              </header>
              <div className="tool-markdown">
                <h3>参数 Schema</h3>
                {selected.parameters
                  ? <pre>{JSON.stringify(selected.parameters, null, 2)}</pre>
                  : <p>该工具不接收结构化参数。</p>}
              </div>
            </article>
          </>
        ) : (
          <>
            {tools.map((tool) => (
              <button key={tool.name} className="catalog-item" onClick={() => open(tool.name)}>
                <strong>{tool.name}</strong>
                <small>{tool.description}</small>
              </button>
            ))}
            {!tools.length && !error && <p className="catalog-empty">暂无工具(etc/tools.json 为空时)</p>}
          </>
        )}
      </div>
    </section>
  );
}
