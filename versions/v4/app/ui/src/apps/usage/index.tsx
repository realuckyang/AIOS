// 用量趋势:token 成本与用量的可视化应用。
// 数据来自 App 的 messages 表(带 usage 的行),经 /api/usage 聚合;
// 花费按配置里的单价换算,两种单价都为 0 时只显示 token、不显示成本。
//
// 交互约定:
//   顶部卡片 = 总览;中间图表 = 按日/按小时的时间趋势(柱 = token 构成,线 = 花费);
//   底部表格 = 分对话的小计。粒度切换即时刷新,无写操作。
import { useEffect, useState } from 'react';
import * as api from '../../api';
import type { UsageChat, UsageOverview, UsageTrendPoint } from '../../types';
import { Icon } from '../../components/Icon';
import './usage.css';

// ── 格式化 ─────────────────────────────────────────────
const fmtNum = (n: number) => Math.round(n).toLocaleString('zh-CN');
const fmtCompact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1e6).toFixed(2)}M`
  : n >= 1_000 ? `${(n / 1e3).toFixed(1)}k`
  : `${Math.round(n)}`;
const fmtMoney = (n: number) =>
  n >= 100 ? n.toFixed(0)
  : n >= 1 ? n.toFixed(2)
  : n.toFixed(4);
const fmtRange = (from: string | null, to: string | null) => {
  if (!from || !to) return '—';
  const d = (s: string) => new Date(s).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `${d(from)} ~ ${d(to)}`;
};

// ── SVG 趋势图表 ────────────────────────────────────────
function TrendChart({ points, currency, hasPrice }: {
  points: UsageTrendPoint[];
  currency: string;
  hasPrice: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return <div className="usage-empty">还没有带用量的话记录</div>;

  const W = 780, H = 300;
  const padL = 56, padR = hasPrice ? 66 : 16, padT = 22, padB = 36;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const bottomY = padT + plotH;

  const maxTokens = Math.max(...points.map((p) => (p.input + p.output)));
  const maxCost = hasPrice ? Math.max(...points.map((p) => p.cost), 0.000001) : 0;
  const n = points.length;
  const step = plotW / n;
  const barW = Math.min(48, step * 0.6);

  const yT = (v: number) => bottomY - (v / (maxTokens || 1)) * plotH;
  const yC = (v: number) => bottomY - (v / (maxCost || 1)) * plotH;
  const xAt = (i: number) => padL + i * step + (step - barW) / 2;
  const cxAt = (i: number) => padL + i * step + step / 2;

  // x 轴刻度:点太多就抽稀
  const labelEvery = Math.max(1, Math.ceil(n / 10));
  const showLabel = (i: number) => n <= 12 || i % labelEvery === 0 || i === n - 1;

  const grid = [0, 0.5, 1].map((f) => ({ y: padT + plotH * (1 - f), v: (maxTokens || 1) * f }));

  const hoverP = hover != null ? points[hover] : null;

  return (
    <div className="usage-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="usage-svg" preserveAspectRatio="xMidYMid meet">
        {/* 网格与 token 轴 */}
        {grid.map((g) => (
          <g key={g.y}>
            <line x1={padL} x2={W - padR} y1={g.y} y2={g.y} className="usage-grid" />
            <text x={padL - 8} y={g.y + 3} className="usage-tick" textAnchor="end">{fmtCompact(g.v)}</text>
          </g>
        ))}
        {/* 花费轴(右) */}
        {hasPrice && grid.map((g) => (
          <text key={g.y} x={W - padR + 8} y={g.y + 3} className="usage-tick usage-tick-cost" textAnchor="start">
            {fmtMoney((maxCost || 0) * (1 - (g.y - padT) / plotH))}
          </text>
        ))}

        {/* x 轴基线 */}
        <line x1={padL} x2={W - padR} y1={bottomY} y2={bottomY} className="usage-axis" />

        {/* 柱:缓存(底) + 非缓存输入(中) + 输出(顶) */}
        {points.map((p, i) => {
          const cached = p.cached;
          const fresh = Math.max(0, p.input - cached);
          const output = p.output;
          const x = xAt(i);
          return (
            <g key={p.bucket}
               onMouseEnter={() => setHover(i)}
               onMouseLeave={() => setHover(null)}
               className="usage-bar-g">
              <rect x={x} y={yT(cached)} width={barW} height={bottomY - yT(cached)} className="usage-seg usage-seg-cached" />
              <rect x={x} y={yT(cached + fresh)} width={barW} height={yT(cached) - yT(cached + fresh)} className="usage-seg usage-seg-fresh" />
              <rect x={x} y={yT(cached + fresh + output)} width={barW} height={yT(cached + fresh) - yT(cached + fresh + output)} className="usage-seg usage-seg-output" />
            </g>
          );
        })}

        {/* 花费线 */}
        {hasPrice && (
          <path
            d={points.map((p, i) => `${i === 0 ? 'M' : 'L'}${cxAt(i)},${yC(p.cost)}`).join(' ')}
            fill="none" className="usage-cost-line" />
        )}
        {hasPrice && points.map((p, i) => (
          <circle key={p.bucket} cx={cxAt(i)} cy={yC(p.cost)} r={3} className="usage-cost-dot" />
        ))}

        {/* x 轴标签 */}
        {points.map((p, i) => showLabel(i) ? (
          <text key={p.bucket} x={cxAt(i)} y={H - 14} className="usage-tick usage-tick-x" textAnchor="middle">{p.label}</text>
        ) : null)}
      </svg>

      {/* hover 提示 */}
      {hoverP && hover != null && (
        <div
          className="usage-tip"
          style={{ left: `${(cxAt(hover) / W) * 100}%`, top: 6 }}
        >
          <div className="usage-tip-label">{hoverP.label}</div>
          <div className="usage-tip-row"><i style={{ background: 'var(--link)' }} />输入 {fmtNum(hoverP.input)}</div>
          {hoverP.cached > 0 && <div className="usage-tip-row"><i style={{ background: 'var(--ok)' }} />缓存 {fmtNum(hoverP.cached)}</div>}
          <div className="usage-tip-row"><i style={{ background: 'var(--run)' }} />输出 {fmtNum(hoverP.output)}</div>
          <div className="usage-tip-row"><i className="usage-tip-cost-i" />{currency} {fmtMoney(hoverP.cost)}</div>
          <div className="usage-tip-sub">{hoverP.requests} 次请求</div>
        </div>
      )}
    </div>
  );
}

// ── 应用 ────────────────────────────────────────────────
export default function UsageApp() {
  const [overview, setOverview] = useState<UsageOverview | null>(null);
  const [trend, setTrend] = useState<UsageTrendPoint[]>([]);
  const [chats, setChats] = useState<UsageChat[]>([]);
  const [granularity, setGranularity] = useState<'day' | 'hour'>('hour');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.getUsage().then((o) => { if (alive) setOverview(o); }).catch((e: Error) => { if (alive) setError(e.message); });
    api.getUsageChats().then((c) => { if (alive) setChats(c.chats); }).catch((e: Error) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    api.getUsageTrend(granularity)
      .then((t) => { if (alive) { setTrend(t.points); setLoaded(true); } })
      .catch((e: Error) => { if (alive) { setError(e.message); setLoaded(true); } });
    return () => { alive = false; };
  }, [granularity]);

  const currency = overview?.currency ?? '¥';
  const hasPrice = overview?.hasPrice ?? false;

  return (
    <section id="usage-app">
      <div className="usage-inner">
        <header className="usage-head">
          <div className="usage-title">
            <h1>用量趋势</h1>
            <p>token 成本与用量,实时来自 var/aios.db 的 messages.usage</p>
          </div>
          {overview && <span className="usage-range">{fmtRange(overview.from, overview.to)}</span>}
        </header>

        {error && <p className="usage-error">{error}</p>}

        {loaded && overview && (
          <>
            {/* 总览卡片 */}
            <div className="usage-cards">
              {hasPrice && (
                <div className="usage-card usage-card-hero">
                  <span className="usage-card-label">总花费</span>
                  <span className="usage-card-value">{currency}{fmtMoney(overview.cost)}</span>
                  <span className="usage-card-sub">按配置单价估算</span>
                </div>
              )}
              <div className="usage-card">
                <span className="usage-card-label">输入</span>
                <span className="usage-card-value">{fmtCompact(overview.input)}</span>
                <span className="usage-card-sub">{fmtNum(overview.input)} tokens</span>
              </div>
              <div className="usage-card">
                <span className="usage-card-label">缓存命中</span>
                <span className="usage-card-value">{fmtCompact(overview.cached)}</span>
                <span className="usage-card-sub">{fmtNum(overview.cached)} tokens</span>
              </div>
              <div className="usage-card">
                <span className="usage-card-label">输出</span>
                <span className="usage-card-value">{fmtCompact(overview.output)}</span>
                <span className="usage-card-sub">{fmtNum(overview.output)} tokens</span>
              </div>
              <div className="usage-card">
                <span className="usage-card-label">请求数</span>
                <span className="usage-card-value">{overview.requests}</span>
                <span className="usage-card-sub">次模型响应</span>
              </div>
            </div>

            {/* 趋势图 */}
            <div className="usage-panel">
              <div className="usage-panel-head">
                <div className="usage-panel-title">
                  <Icon name="chart" size={15} />
                  <span>趋势</span>
                </div>
                <div className="usage-toggle" role="tablist">
                  <button className={granularity === 'hour' ? 'on' : ''} onClick={() => setGranularity('hour')}>按小时</button>
                  <button className={granularity === 'day' ? 'on' : ''} onClick={() => setGranularity('day')}>按日</button>
                </div>
              </div>
              <div className="usage-legend">
                <span className="usage-legend-item"><i style={{ background: 'var(--ok)' }} />缓存</span>
                <span className="usage-legend-item"><i style={{ background: 'var(--link)' }} />输入</span>
                <span className="usage-legend-item"><i style={{ background: 'var(--run)' }} />输出</span>
                {hasPrice && <span className="usage-legend-item"><i className="usage-legend-cost" />花费</span>}
              </div>
              <TrendChart points={trend} currency={currency} hasPrice={hasPrice} />
            </div>

            {/* 分对话小计 */}
            <div className="usage-panel">
              <div className="usage-panel-head">
                <div className="usage-panel-title">
                  <Icon name="panel" size={15} />
                  <span>分对话</span>
                </div>
              </div>
              <div className="usage-table">
                <div className="usage-tr usage-tr-head">
                  <span>对话</span>
                  <span>输入</span>
                  {hasPrice && <span>花费</span>}
                  <span>请求</span>
                  <span>最近</span>
                </div>
                {chats.map((c) => (
                  <div key={c.id} className="usage-tr">
                    <span className="usage-tc-title" title={c.title}>{c.title || c.id}</span>
                    <span className="usage-tc-num">{fmtCompact(c.input)}</span>
                    {hasPrice && <span className="usage-tc-cost">{currency}{fmtMoney(c.cost)}</span>}
                    <span className="usage-tc-num">{c.requests}</span>
                    <span className="usage-tc-when">{new Date(c.at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
                  </div>
                ))}
                {!chats.length && <div className="usage-empty">还没有用量的对话</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
