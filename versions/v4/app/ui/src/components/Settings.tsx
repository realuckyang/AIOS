import { useEffect, useMemo, useState } from 'react';
import * as api from '../api';
import type { ConfigField, ConfigGroup } from '../types';

// 自动保存:失焦即写,没有保存键。需要重启才生效的字段自己带角标。
export function Settings() {
  const [groups, setGroups] = useState<ConfigGroup[] | null>(null);
  const [active, setActive] = useState('');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    api.getConfig()
      .then((schema) => { setGroups(schema.groups); setActive((current) => current || schema.groups[0]?.id || ''); })
      .catch((e: Error) => setError(e.message));
  }, []);

  const fields = useMemo(
    () => groups?.find((group) => group.id === active)?.fields ?? [],
    [groups, active],
  );

  if (!groups) return <section id="settings"><p className="set-empty">{error || '正在读取配置…'}</p></section>;

  const shown = (field: ConfigField) => draft[field.key] ?? String(field.value);

  const commit = async (field: ConfigField, raw: string | null) => {
    const value = raw === null
      ? null
      : field.type === 'number' ? Number(raw)
      : field.type === 'ratio' ? Number(raw)
      : raw;
    if (raw !== null && String(field.value) === raw) return;
    setError('');
    try {
      const schema = await api.updateConfig({ [field.key]: value });
      setGroups(schema.groups);
      setDraft((current) => { const next = { ...current }; delete next[field.key]; return next; });
      setSaved(field.restartRequired ? `${field.label} 已保存,重启后生效` : `${field.label} 已保存`);
      setTimeout(() => setSaved(''), 2400);
    } catch (e) {
      setError((e as Error).message);
      setDraft((current) => { const next = { ...current }; delete next[field.key]; return next; });
    }
  };

  return (
    <section id="settings">
      <nav className="set-tabs">
        {groups.map((group) => (
          <button
            key={group.id}
            className={`set-tab${group.id === active ? ' is-active' : ''}${group.divider ? ' has-divider' : ''}`}
            onClick={() => setActive(group.id)}
          >
            {group.title}
          </button>
        ))}
      </nav>

      <div className="set-panel">
        {fields.map((field) => (
          <label className="field" key={field.key}>
            <span className="field-label">
              <strong>{field.label}</strong>
              {field.restartRequired && <em className="field-tag">需重启</em>}
              {field.changed && !field.restartRequired && (
                <button className="field-reset" onClick={(event) => { event.preventDefault(); commit(field, null); }}>
                  恢复默认
                </button>
              )}
              <small>{field.description}</small>
            </span>
            {field.type === 'text' ? (
              <textarea
                className="input input-text"
                rows={8}
                value={shown(field)}
                placeholder={field.default ? String(field.default) : '留空使用内置默认'}
                onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
                onBlur={(event) => commit(field, event.target.value)}
              />
            ) : (
              <input
                className="input"
                type={field.type === 'secret' ? 'password' : field.type === 'string' ? 'text' : 'number'}
                step={field.type === 'ratio' ? 0.05 : 1}
                min={field.type === 'ratio' ? 0.05 : 0}
                max={field.type === 'ratio' ? 1 : undefined}
                value={shown(field)}
                onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
                onBlur={(event) => commit(field, event.target.value)}
              />
            )}
          </label>
        ))}
        <p className="set-foot">
          {error ? <span className="settings-error">{error}</span>
            : saved ? <span className="settings-notice">{saved}</span>
            : <span className="set-hint">改动在失焦时自动保存。</span>}
        </p>
      </div>
    </section>
  );
}
