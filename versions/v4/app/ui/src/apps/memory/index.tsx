// 记忆:agent 与人类共用的持久化事实库。数据在 App 的 memories 表,经 /api/memories 读写;
// agent 用同一组端点沉淀环境盘点、结论与约定,所以「让 AI 记住 X」不需要任何额外机制。
//
// 交互约定:
//   顶部标签栏过滤;「新建」展开表单;点卡片进入详情编辑
//   (正文 textarea、标签可改;置顶/删除在详情里);所有写操作乐观更新,失败回滚。
import { useEffect, useMemo, useState } from 'react';
import * as api from '../../api';
import type { Memory } from '../../types';
import { Icon } from '../../components/Icon';
import './memory.css';

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
};

const preview = (body: string) => {
  const one = body.replace(/\s+/g, ' ').trim();
  return one.length > 160 ? one.slice(0, 160) + '…' : one;
};

export default function MemoryApp() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [tagCounts, setTagCounts] = useState<{ tag: string; count: number }[]>([]);
  const [activeTag, setActiveTag] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState({ title: '', body: '', tags: '' });
  const [open, setOpen] = useState<Memory | null>(null);
  const [edit, setEdit] = useState<{ title: string; body: string; tags: string } | null>(null);

  const reload = () => {
    api.listMemories(activeTag || undefined)
      .then((list) => { setMemories(list); setLoaded(true); })
      .catch((e: Error) => { setError(e.message); setLoaded(true); });
    api.listMemoryTags()
      .then(setTagCounts)
      .catch(() => {});
  };

  useEffect(reload, [activeTag]);

  const total = useMemo(() => tagCounts.reduce((s, t) => s + t.count, 0), [tagCounts]);

  const apply = (next: Memory[], action: () => Promise<unknown>) => {
    const before = memories;
    setError('');
    setMemories(next);
    action().catch((e: Error) => { setMemories(before); setError(e.message); });
  };

  const add = () => {
    const title = draft.title.trim();
    if (!title) return;
    const tags = draft.tags.split(/[,，]/).map((t) => t.trim().toLowerCase()).filter(Boolean);
    api.createMemory({ title, body: draft.body, tags, source: 'manual' })
      .then((memory) => {
        setComposing(false);
        setDraft({ title: '', body: '', tags: '' });
        setMemories((cur) => [memory, ...cur]);
        reload();
      })
      .catch((e: Error) => setError(e.message));
  };

  const saveEdit = () => {
    if (!open || !edit) return;
    const title = edit.title.trim();
    if (!title) return;
    const tags = edit.tags.split(/[,，]/).map((t) => t.trim().toLowerCase()).filter(Boolean);
    const next = { ...open, title, body: edit.body, tags };
    setOpen(next);
    setEdit(null);
    apply(
      memories.map((m) => (m.id === open.id ? next : m)),
      () => api.patchMemory(open.id, { title, body: edit.body, tags }),
    );
  };

  const togglePin = (memory: Memory) => {
    const pinned = !memory.pinned;
    const next = { ...memory, pinned };
    if (open?.id === memory.id) setOpen(next);
    apply(
      memories.map((m) => (m.id === memory.id ? next : m)),
      () => api.patchMemory(memory.id, { pinned }),
    );
  };

  const remove = (memory: Memory) => {
    setOpen(null);
    apply(memories.filter((m) => m.id !== memory.id), () => api.deleteMemory(memory.id));
  };

  const tagChips = (
    <div className="mem-tags-bar">
      <button className={`mem-chip${!activeTag ? ' on' : ''}`} onClick={() => setActiveTag('')}>
        全部 · {total}
      </button>
      {tagCounts.map((t) => (
        <button
          key={t.tag}
          className={`mem-chip${activeTag === t.tag ? ' on' : ''}`}
          onClick={() => setActiveTag(activeTag === t.tag ? '' : t.tag)}
        >
          {t.tag} · {t.count}
        </button>
      ))}
    </div>
  );

  const tagsOf = (tags: string[]) => (
    <div className="mem-tags">
      {tags.map((t) => (
        <span key={t} className="mem-tag">{t}</span>
      ))}
    </div>
  );

  // ── 详情/编辑视图 ──
  if (open) {
    const isEditing = edit !== null;
    const title = isEditing ? edit.title : open.title;
    const body = isEditing ? edit.body : open.body;
    const tags = isEditing ? edit.tags : open.tags.join('、');
    return (
      <section id="memory-app">
        <div className="mem-inner">
          <button className="mem-back" onClick={() => { setOpen(null); setEdit(null); }}>
            <Icon name="back" size={14} /> 返回列表
          </button>
          <div className="mem-detail">
            {isEditing ? (
              <input className="mem-title-input" value={title} autoFocus
                placeholder="标题"
                onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            ) : (
              <h2 className="mem-title">{title}</h2>
            )}
            <div className="mem-detail-meta">
              <span className={`mem-src ${open.source}`}>{open.source === 'agent' ? 'agent 写入' : open.source === 'runtime' ? '系统记录' : '手动'}</span>
              <span className="mem-time">更新于 {fmtTime(open.updated_at)}</span>
              <button className="mem-pin" onClick={() => togglePin(open)}>
                <Icon name="pin" size={13} /> {open.pinned ? '已置顶' : '置顶'}
              </button>
            </div>
            {isEditing ? (
              <>
                <textarea className="mem-body-input" rows={12} value={body}
                  placeholder="正文,支持多行;agent 也会读这里"
                  onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
                <input className="mem-tags-input" value={tags}
                  placeholder="标签,用逗号分隔(如 cloudflare, machine)"
                  onChange={(e) => setEdit({ ...edit, tags: e.target.value })} />
                <div className="mem-actions">
                  <button className="mem-btn primary" onClick={saveEdit} disabled={!title.trim()}>保存</button>
                  <button className="mem-btn" onClick={() => setEdit(null)}>取消</button>
                </div>
              </>
            ) : (
              <>
                <div className="mem-body">{open.body}</div>
                {tagsOf(open.tags)}
                <div className="mem-actions">
                  <button className="mem-btn primary" onClick={() => setEdit({ title: open.title, body: open.body, tags: open.tags.join('、') })}>
                    <Icon name="pencil" size={13} /> 编辑
                  </button>
                  <button className="mem-btn danger" onClick={() => remove(open)}>
                    <Icon name="trash" size={13} /> 删除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    );
  }

  // ── 列表视图 ──
  return (
    <section id="memory-app">
      <div className="mem-inner">
        <div className="mem-head">
          <div>
            <h1 className="mem-h1">记忆</h1>
            <p className="mem-sub">agent 与人类共用的持久化事实库。环境盘点、结论、约定都沉淀在这里。</p>
          </div>
          <button className="mem-add" onClick={() => setComposing((v) => !v)}>
            <Icon name="plus" size={14} /> {composing ? '收起' : '新建'}
          </button>
        </div>

        {composing && (
          <div className="mem-compose">
            <input className="mem-title-input" value={draft.title}
              placeholder="标题(必填)" autoFocus
              onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <textarea className="mem-body-input" rows={6} value={draft.body}
              placeholder="正文,支持多行"
              onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            <input className="mem-tags-input" value={draft.tags}
              placeholder="标签,用逗号分隔(如 cloudflare, machine)"
              onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
            <div className="mem-actions">
              <button className="mem-btn primary" onClick={add} disabled={!draft.title.trim()}>保存</button>
              <button className="mem-btn" onClick={() => { setComposing(false); setDraft({ title: '', body: '', tags: '' }); }}>取消</button>
            </div>
          </div>
        )}

        {tagChips}

        {error && <p className="mem-error">{error}</p>}

        {loaded && !memories.length && !error && (
          <div className="mem-blank">
            <Icon name="book" size={22} />
            <p>{activeTag ? `没有「${activeTag}」相关的记忆` : '还没有记忆。可以点右上角新建,或让 agent 把环境盘点写进来。'}</p>
          </div>
        )}

        <ul className="mem-list">
          {memories.map((memory) => (
            <li key={memory.id} className={`mem-card${memory.pinned ? ' pinned' : ''} rise-enter`} onClick={() => { setOpen(memory); setEdit(null); }}>
              <div className="mem-card-top">
                <span className="mem-card-title">
                  {memory.pinned && <Icon name="pin" size={12} />}
                  {memory.title}
                </span>
                <span className={`mem-src ${memory.source}`}>{memory.source === 'agent' ? 'agent' : memory.source === 'runtime' ? '系统' : '手动'}</span>
              </div>
              {memory.body && <p className="mem-card-body">{preview(memory.body)}</p>}
              <div className="mem-card-bottom">
                {tagsOf(memory.tags)}
                <span className="mem-time">{fmtTime(memory.updated_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
