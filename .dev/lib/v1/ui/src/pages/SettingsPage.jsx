import { useEffect, useState } from 'react';
import { listSettings, setSetting } from '../api.js';
import { Icon } from '../components/Icon.jsx';

const groups = [
  {
    title: '模型', description: '连接兼容 Responses API 的模型服务。', fields: [
      ['llm.responses_url', 'Responses API 地址', 'url'],
      ['llm.key', '密钥', 'password'],
      ['llm.model', '模型', 'text'],
    ],
  },
  {
    title: '上下文', description: '上下文窗口与自动压缩水位。', fields: [
      ['context.window', '上下文窗口', 'number'],
      ['context.reserve', '压缩预留 Token', 'number'],
      ['context.keep_recent', '保留最近 Token', 'number'],
      ['context.live_result_chars', '工具结果最大字符', 'number'],
    ],
  },
  {
    title: '提示词', description: '对话提示词支持 {{chat_id}} 和 {{api_url}} 占位符。', fields: [
      ['prompt.chat', '对话提示词', 'textarea'],
      ['prompt.compaction', '压缩提示词', 'textarea'],
    ],
  },
];

export function SettingsPage({ sidebarOpen = true, onToggleSidebar = () => {} }) {
  const [values, setValues] = useState({});
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    listSettings().then((data) => {
      setValues(Object.fromEntries(Object.entries(data).map(([key, setting]) => [key, setting.value])));
      setKeyConfigured(Boolean(data['llm.key']?.configured));
      setStatus('ready');
    }).catch((cause) => { setError(cause.message); setStatus('error'); });
  }, []);

  const change = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault(); setStatus('saving'); setError('');
    try {
      for (const [key, value] of Object.entries(values)) {
        if (key === 'llm.key' && !value && keyConfigured) continue;
        await setSetting(key, value);
      }
      if (values['llm.key']) { setKeyConfigured(true); change('llm.key', ''); }
      setStatus('saved');
      setTimeout(() => setStatus('ready'), 1800);
    } catch (cause) { setError(cause.message); setStatus('error'); }
  };

  const clearKey = async () => {
    setStatus('saving'); setError('');
    try { await setSetting('llm.key', ''); setKeyConfigured(false); change('llm.key', ''); setStatus('saved'); }
    catch (cause) { setError(cause.message); setStatus('error'); }
  };

  return (
    <section className="settings-page">
      <header className="settings-header">
        <div className="settings-heading">
          {!sidebarOpen && (
            <button className="sidebar-toggle header-toggle" onClick={onToggleSidebar} title="展开侧边栏">
              <Icon name="panel" size={17} />
            </button>
          )}
          <div>
            <h1>设置</h1>
          </div>
        </div>
      </header>
      <div className="settings-scroll">
        <form className="settings-form" onSubmit={save}>
          {groups.map((group) => (
            <section className="settings-group" key={group.title}>
              <div className="settings-group-title">
                <h2>{group.title}</h2>
                <p>{group.description}</p>
              </div>
              <div className="settings-card">
                {group.fields.map(([key, label, type]) => (
                  <label className="setting-row" key={key}>
                    <span><b>{label}</b></span>
                    <span className="setting-control">
                      {type === 'textarea' ? (
                        <textarea value={values[key] ?? ''} onChange={(e) => change(key, e.target.value)} />
                      ) : (
                        <input
                          type={type}
                          min={type === 'number' ? 1 : undefined}
                          required={key === 'llm.responses_url' || (key === 'llm.key' && !keyConfigured)}
                          value={values[key] ?? ''}
                          placeholder={key === 'llm.responses_url'
                            ? 'https://example.com/v1/responses'
                            : key === 'llm.key' && keyConfigured ? '已配置，留空保持不变' : ''}
                          onChange={(e) => change(key, e.target.value)}
                        />
                      )}
                      {key === 'llm.key' && keyConfigured && (
                        <button className="clear-key" type="button" onClick={clearKey}>清除</button>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ))}
          {error && <div className="settings-error">{error}</div>}
          <div className="settings-actions">
            <span className="saved">{status === 'saved' ? '已保存' : ''}</span>
            <button className="save" type="submit" disabled={status === 'loading' || status === 'saving'}>
              {status === 'saving' ? '保存中…' : '保存更改'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
