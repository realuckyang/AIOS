import { useEffect, useMemo, useState } from 'react';
import * as api from '../api';
import type { ConfigField, ConfigGroup } from '../types';

// 每个 tab 一个明确的保存按钮:改了不落盘,按了才落盘。
//
// **为什么不是失焦即存**:这里放着网关地址、Key、模型名这些一改错就整个跑不起来的东西。
// 失焦即存意味着你打字打到一半切走,一份半截的配置就写进去了。
// 有保存键,你才有一个「还没提交」的状态可以退回来。
export function Settings() {
  const [groups, setGroups] = useState<ConfigGroup[] | null>(null);
  const [active, setActive] = useState('');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getConfig()
      .then((schema) => { setGroups(schema.groups); setActive((current) => current || schema.groups[0]?.id || ''); })
      .catch((e: Error) => setError(e.message));
  }, []);

  const fields = useMemo(
    () => groups?.find((group) => group.id === active)?.fields ?? [],
    [groups, active],
  );

  // 这一页有哪些字段被改过还没存
  const pending = useMemo(
    () => fields.filter((field) => draft[field.key] !== undefined && draft[field.key] !== String(field.value)),
    [fields, draft],
  );
  const needsRestart = pending.some((field) => field.restartRequired);

  if (!groups) return <section id="settings"><p className="set-empty">{error || '正在读取配置…'}</p></section>;

  const shown = (field: ConfigField) => draft[field.key] ?? String(field.value);

  const cast = (field: ConfigField, raw: string) =>
    field.type === 'number' || field.type === 'ratio' || field.type === 'money' ? Number(raw) : raw;

  /** 保存这一页改过的字段。**一次提交,不逐个写** —— 免得存到一半失败留下半截配置。 */
  const save = async () => {
    if (!pending.length || saving) return;
    setError(''); setSaving(true);
    try {
      const patch: Record<string, string | number | null> = {};
      for (const field of pending) patch[field.key] = cast(field, draft[field.key]);
      const schema = await api.updateConfig(patch);
      setGroups(schema.groups);
      setDraft((current) => {
        const next = { ...current };
        for (const field of pending) delete next[field.key];
        return next;
      });
      setSaved(needsRestart ? '已保存,重启后生效' : '已保存');
      setTimeout(() => setSaved(''), 2400);
    } catch (e) {
      setError((e as Error).message);   // **失败不清 draft** —— 你输的东西还在,可以改了再存
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setDraft((current) => {
      const next = { ...current };
      for (const field of fields) delete next[field.key];
      return next;
    });
    setError('');
  };

  /** 恢复默认是立即生效的动作,不进 draft —— 它是「撤销我改过的」,不是「我要改成什么」。 */
  const reset = async (field: ConfigField) => {
    setError('');
    try {
      const schema = await api.updateConfig({ [field.key]: null });
      setGroups(schema.groups);
      setDraft((current) => { const next = { ...current }; delete next[field.key]; return next; });
      setSaved(`${field.label} 已恢复默认`);
      setTimeout(() => setSaved(''), 2400);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const switchTab = (id: string) => {
    if (pending.length && !confirm(`这一页有 ${pending.length} 处改动还没保存,切走会丢掉。要走吗?`)) return;
    discard();
    setActive(id);
  };

  return (
    <section id="settings">
      <nav className="set-tabs">
        {groups.map((group) => (
          <button
            key={group.id}
            className={`set-tab${group.id === active ? ' is-active' : ''}${group.divider ? ' has-divider' : ''}`}
            onClick={() => switchTab(group.id)}
          >
            {group.title}
          </button>
        ))}
      </nav>

      <div className="set-panel">
        {fields.map((field) => {
          const dirty = draft[field.key] !== undefined && draft[field.key] !== String(field.value);
          return (
            <label className={`field${dirty ? ' is-dirty' : ''}`} key={field.key}>
              <span className="field-label">
                <strong>{field.label}</strong>
                {field.restartRequired && <em className="field-tag">需重启</em>}
                {field.changed && !field.restartRequired && (
                  <button className="field-reset" onClick={(event) => { event.preventDefault(); void reset(field); }}>
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
                />
              ) : (
                <input
                  className="input"
                  type={field.type === 'secret' ? 'password' : field.type === 'string' ? 'text' : 'number'}
                  step={field.type === 'ratio' ? 0.05 : field.type === 'money' ? 0.01 : 1}
                  min={field.type === 'ratio' ? 0.05 : 0}
                  max={field.type === 'ratio' ? 1 : undefined}
                  value={shown(field)}
                  onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
                />
              )}
            </label>
          );
        })}

        <div className="set-actions">
          <button className="btn-save" onClick={() => void save()} disabled={!pending.length || saving}>
            {saving ? '保存中' : '保存'}
          </button>
          {pending.length > 0 && !saving && (
            <button className="btn-discard" onClick={discard}>放弃</button>
          )}
          {/* 只在有话要说时才占位:报错、存好了。**平时什么都不显示** */}
          {error && <span className="settings-error">{error}</span>}
          {!error && saved && <span className="settings-notice">{saved}</span>}
        </div>
      </div>
    </section>
  );
}
