// 对话过程体系 —— 按轮收纳:
//
//   · 思考 / 工具各是一行:14px 图标位,悬停换成 chevron,展开转 90°;
//     展开的内容是缩进 22px 的灰底圆角块(参数 / 输出 / 思考全文)。
//   · 相邻的已完成工具收成一行摘要(「已读取2个文件」),展开后是 compact 子条目。
//   · 完成的一轮整体收进「已工作Xs」折叠条(TurnCollapse):
//     一行标签 + chevron,下面一条通栏细线;过程与中间文本都在里面,最终文本在外面。
//   · 运行中的工具标签走 shimmer 扫光;整轮进行中且无内容时是呼吸点 + 正在工作。
import { useState, type ReactNode } from 'react';

import { fmtArgs, fmtResult, formatDuration, type RenderRow } from '../lib/thread';
import { Icon } from './Icon';
import { Markdown } from './Markdown';

type ToolRow = Extract<RenderRow, { kind: 'tool' }>;
type ThinkRow = Extract<RenderRow, { kind: 'think' }>;

/** 一轮里按序排布的条目:过程(思考/工具)与中间文本。 */
export type TurnEntry =
  | { kind: 'think'; row: ThinkRow }
  | { kind: 'tool'; row: ToolRow }
  | { kind: 'text'; row: Extract<RenderRow, { kind: 'text' }> };

/* ── 工具的图形与文案(对齐 etc/tools.json 的出厂工具;未知名回退原名)── */

const basename = (value: unknown) => String(value ?? '').split('/').filter(Boolean).pop() || '';

function toolMeta(row: ToolRow): { icon: ReactNode; label: string; pill: string; pillWide: boolean } {
  switch (row.name) {
    case 'read':
      return { icon: <Icon name="book" size={14} />, label: '读取', pill: basename(row.args.path), pillWide: false };
    case 'write':
      return { icon: <Icon name="pencil" size={13} />, label: '写入', pill: basename(row.args.path), pillWide: false };
    case 'edit':
      return { icon: <Icon name="pencil" size={13} />, label: '编辑', pill: basename(row.args.path), pillWide: false };
    case 'bash':
      // summary 是工具约定里专为界面写的一句话目的;命令本身在展开的参数块里
      return { icon: <Icon name="terminal" size={14} />, label: '执行', pill: row.summary || String(row.args.command ?? ''), pillWide: true };
    default:
      return { icon: <Icon name="terminal" size={14} />, label: row.name, pill: row.summary, pillWide: true };
  }
}

/* ── 行骨架:图标位(glyph ⇄ chevron)+ 标签 —— 思考与工具共用 ── */

function ProcIconSlot({ icon }: { icon: ReactNode }) {
  return (
    <span className="pi">
      <span className="pi-glyph">{icon}</span>
      <span className="pi-chev"><Icon name="chev" size={12} /></span>
    </span>
  );
}

/* ── 思考条目 ── */

export function ThinkItem({ row, compact }: { row: ThinkRow; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`pc${open ? ' open' : ''}${compact ? ' sm' : ''}`}>
      <button className="pc-head" onClick={() => setOpen(!open)}>
        <ProcIconSlot icon={<Icon name="think" size={compact ? 12 : 14} />} />
        <span className="pc-label"><i className={row.streaming ? 'shimmer' : undefined}>{row.streaming ? '思考中' : '思考'}</i></span>
      </button>
      {open && (
        <div className="pc-blocks">
          <div className="expand-block">{row.text}</div>
        </div>
      )}
    </div>
  );
}

/* ── 工具条目 ── */

export function ToolItem({ row, compact }: { row: ToolRow; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = toolMeta(row);
  const running = row.status === 'running';
  const canExpand = !running;
  return (
    <div className={`pc${open ? ' open' : ''}${compact ? ' sm' : ''}${row.failed ? ' faded' : ''}`}>
      <button className="pc-head" disabled={!canExpand} onClick={() => canExpand && setOpen(!open)} title={row.summary || undefined}>
        <ProcIconSlot icon={meta.icon} />
        <span className="pc-label">
          <i className={running ? 'shimmer' : undefined}>{meta.label}</i>
          {meta.pill && (
            <span className="tpill" style={meta.pillWide ? { maxWidth: 250 } : undefined}>
              <span>{meta.pill}</span>
            </span>
          )}
        </span>
      </button>
      {open && (
        <div className="pc-blocks">
          <div className="expand-block">{fmtArgs(row.args)}</div>
          <div className="expand-block">{row.result ? fmtResult(row.result) : '(无输出)'}</div>
        </div>
      )}
    </div>
  );
}

/* ── 工具分组:相邻已完成工具 ≥2 收成一行摘要 ── */

type GroupKind = 'create' | 'edit' | 'read' | 'exec';

function groupKind(row: ToolRow): GroupKind {
  if (row.name === 'read') return 'read';
  if (row.name === 'write') return 'create';
  if (row.name === 'edit') return 'edit';
  return 'exec';
}

/** read / edit / create 按去重后的路径数计;exec 按次数计。 */
function groupCount(rows: ToolRow[], kind: GroupKind) {
  if (kind === 'exec') return rows.length;
  const paths = new Set<string>();
  for (const row of rows) paths.add(String(row.args.path ?? '').trim() || row.key);
  return paths.size;
}

const GROUP_LABELS: Record<GroupKind, (n: number) => string> = {
  create: (n) => `已写入${n}个文件`,
  edit: (n) => `已修改${n}个文件`,
  read: (n) => `已读取${n}个文件`,
  exec: (n) => `已执行${n}条命令`,
};

function groupSummary(rows: ToolRow[]): string {
  // 顺序:create、edit、read、exec;多类并存时顿号相连
  const kinds: GroupKind[] = ['create', 'edit', 'read', 'exec'];
  const parts: string[] = [];
  for (const kind of kinds) {
    const matching = rows.filter((row) => groupKind(row) === kind);
    if (!matching.length) continue;
    parts.push(GROUP_LABELS[kind](groupCount(matching, kind)));
  }
  return parts.join('、');
}

/** 分组的头部图标:混合取代表(edit > create > read > exec)。 */
function groupIcon(rows: ToolRow[]): ReactNode {
  const pick = rows.find((row) => groupKind(row) === 'edit')
    || rows.find((row) => groupKind(row) === 'create')
    || rows.find((row) => groupKind(row) === 'read')
    || rows[0];
  return toolMeta(pick).icon;
}

export function ToolGroupItem({ rows }: { rows: ToolRow[] }) {
  const [open, setOpen] = useState(false);
  const faded = rows.every((row) => row.failed);
  return (
    <div className={`pc${open ? ' open' : ''}${faded ? ' faded' : ''}`}>
      <button className="pc-head" onClick={() => setOpen(!open)}>
        <ProcIconSlot icon={groupIcon(rows)} />
        <span className="pc-label"><i>{groupSummary(rows)}</i></span>
      </button>
      {open && (
        <div className="pc-group-body">
          {rows.map((row) => <ToolItem key={row.key} row={row} compact />)}
        </div>
      )}
    </div>
  );
}

/* ── 轮折叠条 ── */

export function TurnCollapse({ durationMs, children }: { durationMs: number | null; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const label = durationMs != null && durationMs > 0 ? `已工作${formatDuration(durationMs)}` : '已完成';
  return (
    <div className={`turn${open ? ' open' : ''}`}>
      <button className="turn-head" onClick={() => setOpen(!open)}>
        <span className="turn-row">
          <span className="turn-label">{label}</span>
          <span className="turn-chev"><Icon name="chev" size={12} /></span>
        </span>
        <span className="turn-line" />
      </button>
      {open && <div className="turn-body">{children}</div>}
    </div>
  );
}

/* ── 有序渲染一串条目:过程做相邻分组,中间文本按 markdown 平铺 ──
   inTurn=true 时条目裸排(折叠条内部自带 gap);否则每条包一层消息行。 */

export function TurnEntries({ items, inTurn }: { items: TurnEntry[]; inTurn?: boolean }) {
  const nodes: ReactNode[] = [];
  let pendingTools: ToolRow[] = [];

  const flushTools = () => {
    if (!pendingTools.length) return;
    const rows = pendingTools;
    pendingTools = [];
    nodes.push(rows.length >= 2
      ? <ToolGroupItem key={`group:${rows[0].key}`} rows={rows} />
      : <ToolItem key={rows[0].key} row={rows[0]} />);
  };

  for (const item of items) {
    if (item.kind === 'tool') {
      // 运行中的工具不进分组 —— 它要单独一行走 shimmer
      if (item.row.status === 'running') {
        flushTools();
        nodes.push(<ToolItem key={item.row.key} row={item.row} />);
      } else {
        pendingTools.push(item.row);
      }
      continue;
    }
    flushTools();
    if (item.kind === 'think') {
      nodes.push(<ThinkItem key={item.row.key} row={item.row} />);
    } else {
      nodes.push(<Markdown key={item.row.key} text={item.row.text} />);
    }
  }
  flushTools();

  if (inTurn) return <>{nodes}</>;
  return <>{nodes.map((node, index) => <div key={index} className="cmsg relay">{node}</div>)}</>;
}

/* ── 整轮进行中、暂无可显示内容时的那行 ── */

export function WorkingLine() {
  return (
    <div className="working">
      <span className="working-dot" />
      <span className="working-text shimmer">正在工作</span>
    </div>
  );
}
