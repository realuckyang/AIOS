// 技能商店:浏览讯飞 skillhub 的技能列表,一键安装/卸载,点卡片看详情。
// 数据经后端 /api/skills-store 代理(避免浏览器跨域 + 汇总成前端结构),
// 安装走 install 端点,把技能包 zip 解压到本地 skills/<slug>/。
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import * as api from '../../api';
import type { StoreSkill, StoreSkillDetail } from '../../types';
import { Icon } from '../../components/Icon';
import './skillstore.css';

const fmtDate = (ms: number) =>
  ms ? new Date(ms).toLocaleDateString() : '未知';

function DetailView({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [detail, setDetail] = useState<StoreSkillDetail | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setError('');
    api.getStoreSkill(slug)
      .then((d) => setDetail(d))
      .catch((e: Error) => setError(e.message));
    api.listInstalled().then((r) => setInstalled(r.slugs.includes(slug))).catch(() => {});
  }, [slug]);

  const act = (fn: () => Promise<{ ok: boolean; reason?: string }>) => {
    setBusy(true); setError(''); setNotice('');
    fn().then((r) => {
      if (r.ok) {
        setNotice('操作成功');
        api.listInstalled().then((x) => setInstalled(x.slugs.includes(slug))).catch(() => {});
      } else if (r.reason === 'already-installed') setNotice('该技能已安装');
      else if (r.reason === 'not-installed') setNotice('该技能未安装');
      else setError(r.reason || '操作失败');
    }).catch((e: Error) => setError(e.message)).finally(() => setBusy(false));
  };

  return (
    <section id="skillstore-app">
    <div className="ss-detail">
      <button className="ss-back" onClick={onBack}><Icon name="back" size={14} /> 返回列表</button>
      {error && <p className="ss-error">{error}</p>}
      {notice && <p className="ss-notice">{notice}</p>}
      {!detail && !error && <div className="ss-blank">加载详情…</div>}
      {detail && (
        <>
          <div className="ss-detail-head">
            <div>
              <h2 className="ss-detail-name">{detail.name}</h2>
              <div className="ss-meta">
                <span><Icon name="skill" size={12} /> {detail.slug}</span>
                <span>v{detail.version || '—'}</span>
                <span>更新 {fmtDate(detail.updatedAt)}</span>
              </div>
            </div>
            {installed
              ? <button className="ss-install installed" disabled={busy} onClick={() => act(() => api.uninstallStoreSkill(slug))}>{busy ? '处理中…' : '卸载'}</button>
              : <button className="ss-install" disabled={busy} onClick={() => act(() => api.installStoreSkill(slug))}>{busy ? '安装中…' : '安装'}</button>}
          </div>

          <p className="ss-detail-summary">{detail.summary || '暂无描述'}</p>

          <div className="ss-detail-grid">
            <div className="ss-stat"><span className="ss-stat-v">{(detail.downloads ?? 0).toLocaleString()}</span><span className="ss-stat-k">下载</span></div>
            <div className="ss-stat"><span className="ss-stat-v">{detail.stars ?? 0}</span><span className="ss-stat-k">星</span></div>
            <div className="ss-stat"><span className="ss-stat-v">{detail.license ?? '—'}</span><span className="ss-stat-k">许可</span></div>
            <div className="ss-stat">
              <span className={`ss-stat-v ${detail.moderation === 'clean' ? 'ss-good' : 'ss-warn'}`}>{detail.moderation || 'unknown'}</span>
              <span className="ss-stat-k">安全审核</span>
            </div>
          </div>

          {installed && <p className="ss-hint">已在本地 <code>skills/{detail.slug}/</code>,Skills 列表可直接使用。</p>}
        </>
      )}
    </div>
    </section>
  );
}

export default function SkillStoreApp() {
  const [skills, setSkills] = useState<StoreSkill[]>([]);
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [slug, setSlug] = useState<string | null>(null);

  const refreshInstalled = () =>
    api.listInstalled().then((r) => setInstalled(new Set(r.slugs))).catch(() => {});

  const load = (cursor?: string) => {
    setLoading(true);
    setError('');
    api.listStoreSkills(cursor)
      .then((r) => {
        setSkills((cur) => (cursor ? [...cur, ...r.items] : r.items));
        setNextCursor(r.nextCursor);
      })
      .catch((e: Error) => { setError(e.message); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshInstalled();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const install = (e: MouseEvent, sid: string) => {
    e.stopPropagation();
    if (installing) return;
    setInstalling(sid);
    setError('');
    setNotice('');
    api.installStoreSkill(sid)
      .then((r) => {
        if (r.ok) { setNotice(`已安装 ${sid}`); refreshInstalled(); }
        else setError(r.reason === 'already-installed' ? `${sid} 已安装` : `安装 ${sid} 失败`);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setInstalling(''));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return skills;
    return skills.filter((s) =>
      s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q) || (s.summary || '').toLowerCase().includes(q));
  }, [skills, query]);

  if (slug) return <DetailView slug={slug} onBack={() => setSlug(null)} />;

  return (
    <section id="skillstore-app">
      <div className="ss-inner">
        <div className="ss-head">
          <div className="ss-title">
            <Icon name="skill" size={18} />
            <span>技能商店</span>
          </div>
          <span className="ss-count">{installed.size} 已装 · {skills.length} 在架</span>
        </div>

        <div className="ss-search">
          <input
            value={query}
            placeholder="搜索技能名 / slug / 描述,点击卡片看详情"
            onChange={(e) => setQuery(e.target.value)}
          />
          <Icon name="check" size={15} />
        </div>

        {error && <p className="ss-error">{error}</p>}
        {notice && <p className="ss-notice">{notice}</p>}

        <ul className="ss-list">
          {filtered.map((s) => {
            const isInstalled = installed.has(s.slug);
            return (
              <li key={s.slug} className="ss-card" onClick={() => setSlug(s.slug)}>
                <div className="ss-card-main">
                  <div className="ss-card-title">
                    <span className="ss-name">{s.name}</span>
                    {isInstalled && <span className="ss-badge">已安装</span>}
                  </div>
                  <p className="ss-summary">{s.summary || '暂无描述'}</p>
                  <div className="ss-meta">
                    <span><Icon name="chart" size={12} /> {(s.downloads ?? 0).toLocaleString()} 下载</span>
                    <span><Icon name="clock" size={12} /> {(s.stars ?? 0)} 星</span>
                    {s.version && <span className="ss-ver">v{s.version}</span>}
                  </div>
                </div>
                <button
                  className="ss-install"
                  disabled={isInstalled || installing === s.slug}
                  onClick={(e) => install(e, s.slug)}
                >
                  {installing === s.slug ? '安装中…' : isInstalled ? '已安装' : '安装'}
                </button>
              </li>
            );
          })}
        </ul>

        {!loading && !filtered.length && <div className="ss-blank">没有匹配的技能</div>}
        {loading && <div className="ss-blank">加载中…</div>}
        {nextCursor && !loading && (
          <button className="ss-more" onClick={() => load(nextCursor)}>加载更多</button>
        )}
      </div>
    </section>
  );
}
