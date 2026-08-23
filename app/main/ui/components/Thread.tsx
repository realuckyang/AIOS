// 消息流 —— 按轮收纳:
//
//   · 一条用户消息(或 runtime 唤醒)起一轮。轮内的思考 / 工具 / 中间文本是过程,
//     最后那条正文是结果。
//   · 轮完成且有最终文本 → 过程整体收进「已工作Xs」折叠条,最终文本站在外面;
//   · 轮还在进行中(或没有最终文本,比如中途停掉)→ 平铺,过程依次展示;
//   · 用户消息是右侧灰底气泡;助理最终文本无气泡全宽 markdown,
//     悬停出现复制行,最后一条常显。
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { ErrorBanner, Streams } from '../hooks/useAios';
import type { Row } from '../types';
import { buildRows, dayLabel, type RenderRow } from '../lib/thread';
import { Markdown } from './Markdown';
import { Icon } from './Icon';
import { TurnCollapse, TurnEntries, WorkingLine, type TurnEntry } from './Process';

type UserRow = Extract<RenderRow, { kind: 'user' }>;
type TextRow = Extract<RenderRow, { kind: 'text' }>;
type RuntimeRow = Extract<RenderRow, { kind: 'runtime' }>;

type Block =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'user'; key: string; row: UserRow }
  | { kind: 'final'; key: string; row: TextRow }
  | { kind: 'runtime'; key: string; row: RuntimeRow }
  | { kind: 'flat'; key: string; items: TurnEntry[] }
  | { kind: 'turn'; key: string; items: TurnEntry[]; durationMs: number | null; forgotten: boolean };

interface ThreadProps {
  items: Row[];
  contextStart: number;
  streams: Streams;
  busy: boolean;
  errors: ErrorBanner[];
  onDismissError: (id: number) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => Promise<void>;
  onStarter: (text: string) => void;
}

/** 空白对话的起手式。**每一条都是它真做得到的事** ——
    摆一个做不到的例子,第一次尝试就是一次失败。 */
const STARTERS: Array<{ icon: string; text: string }> = [
  { icon: 'terminal', text: '看看这台机器现在的资源占用,给我一份摘要' },
  { icon: 'book', text: '读一下你自己的仓库,解释这套系统是怎么跑起来的' },
  { icon: 'clock', text: '每小时检查一次磁盘剩余空间,不够了提醒我' },
];

/** 助理最终文本:全宽 markdown + 复制行。 */
const FinalText = memo(function FinalText({ row, always }: { row: TextRow; always: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(row.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className={`cmsg relay${row.forgotten ? ' forgotten' : ''}`}>
      <Markdown text={row.text} />
      <div className={`actrow${always ? ' always' : ''}`}>
        <button className={`act${copied ? ' done' : ''}`} title="复制" onClick={copy}>
          <Icon name={copied ? 'check' : 'copy'} size={14} />
        </button>
      </div>
    </div>
  );
});

export const Thread = memo(function Thread({
  items, contextStart, streams, busy, errors, onDismissError, hasMore, loadingMore, onLoadMore, onStarter,
}: ThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  // 「粘底」:贴着底部时任何高度变化都跟着走;用户上滚就不打扰,滚回底部重新粘上。
  const stick = useRef(true);
  const restoreFromTop = useRef(0);
  // 展开了的 runtime 消息。**默认全折** —— 它们是某一轮的起因,不是内容
  const [opened, setOpened] = useState<Set<string>>(new Set());

  const renderRows = useMemo(() => buildRows(items, contextStart), [items, contextStart]);

  const blocks = useMemo<Block[]>(() => {
    const output: Block[] = [];
    let lastDay = '';

    // 当前这一轮攒下的东西。turnStartTs 是轮起点(用户消息 / 唤醒消息的时间)。
    let entries: TurnEntry[] = [];
    let turnStartTs: number | undefined;
    let turnLastTs: number | undefined;
    let turnKey = '__head__';

    const ts = (at: string) => {
      const value = new Date(at).getTime();
      return Number.isNaN(value) ? undefined : value;
    };
    const noteTs = (at: string) => { const value = ts(at); if (value) turnLastTs = value; };

    /**
     * 收掉当前这轮。live = 这是最后一轮且还在跑。
     * 规则:有最终文本且已完成 → 过程进折叠条、最终文本在外;否则平铺。
     * 最终文本 = 轮里最后一条非流式正文。
     */
    const flushTurn = (live: boolean) => {
      if (!entries.length) { turnStartTs = undefined; turnLastTs = undefined; return; }
      const list = entries;
      entries = [];

      let finalIndex = -1;
      for (let i = list.length - 1; i >= 0; i--) {
        const entry = list[i];
        if (entry.kind === 'text' && !entry.row.streaming) { finalIndex = i; break; }
      }
      // 不变量:轮还活着 → 全平铺、按 seq 顺序(此刻无从判断哪条是最终答案,
      // 中间叙述文本也是 text,谁都不能抬)。轮完成才折叠过程、抬出真正的最后一条正文。
      if (live || finalIndex < 0) {
        output.push({ kind: 'flat', key: `flat:${turnKey}`, items: list });
      } else {
        const final = list[finalIndex] as Extract<TurnEntry, { kind: 'text' }>;
        const process = list.filter((_, index) => index !== finalIndex);
        if (process.length) {
          const durationMs = turnStartTs && turnLastTs && turnLastTs > turnStartTs ? turnLastTs - turnStartTs : null;
          const forgotten = process.every((entry) => entry.row.forgotten);
          output.push({ kind: 'turn', key: `turn:${turnKey}`, items: process, durationMs, forgotten });
        }
        output.push({ kind: 'final', key: final.row.key, row: final.row });
      }
      turnStartTs = undefined;
      turnLastTs = undefined;
    };

    for (const row of renderRows) {
      const day = dayLabel(row.at);
      if (day && day !== lastDay) {
        // 换天先把上一轮收掉,日期条不站在折叠条中间
        flushTurn(false);
        output.push({ kind: 'day', key: `day:${row.key}`, label: day });
        lastDay = day;
      }

      if (row.kind === 'user') {
        flushTurn(false);
        turnKey = row.key;
        turnStartTs = ts(row.at);
        output.push({ kind: 'user', key: row.key, row });
        continue;
      }
      if (row.kind === 'runtime') {
        // 唤醒消息独立成块,但它是下一轮的起点
        flushTurn(false);
        turnKey = row.key;
        turnStartTs = ts(row.at);
        output.push({ kind: 'runtime', key: row.key, row });
        continue;
      }
      entries.push({ kind: row.kind, row } as TurnEntry);
      noteTs(row.at);
    }

    // 流式增量:当前轮的活内容,平铺在最后
    if (busy && streams.reasoning) {
      entries.push({
        kind: 'think',
        row: { kind: 'think', key: 'stream:think', at: '', forgotten: false, text: streams.reasoning, streaming: true },
      });
    }
    if (busy && streams.message) {
      entries.push({
        kind: 'text',
        row: { kind: 'text', key: 'stream:text', at: '', forgotten: false, text: streams.message, streaming: true },
      });
    }
    flushTurn(busy);
    return output;
  }, [renderRows, busy, streams]);

  // 最后那条最终文本:复制行常显(其余悬停出现)
  const lastFinalKey = useMemo(() => {
    for (let i = blocks.length - 1; i >= 0; i--) {
      const block = blocks[i];
      if (block.kind === 'final') return block.key;
    }
    return '';
  }, [blocks]);

  const showWorking = useMemo(() => {
    if (!busy || streams.message || streams.reasoning) return false;
    // 过程行自己带着 shimmer 时轮不到呼吸点
    const last = renderRows[renderRows.length - 1];
    return !(last && last.kind === 'tool' && last.status === 'running');
  }, [busy, streams, renderRows]);

  const onScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    stick.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
    if (element.scrollTop < 60 && hasMore && !loadingMore) {
      restoreFromTop.current = element.scrollHeight; // 记住旧高度,加载后保持视口
      void onLoadMore();
    }
  };

  useEffect(() => {
    const element = scrollRef.current;
    const inner = innerRef.current;
    if (!element || !inner) return;
    element.scrollTop = element.scrollHeight;
    const observer = new ResizeObserver(() => {
      if (restoreFromTop.current) {
        element.scrollTop = element.scrollHeight - restoreFromTop.current;
        restoreFromTop.current = 0;
      } else if (stick.current) {
        element.scrollTop = element.scrollHeight;
      }
    });
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  const empty = !blocks.length && !busy && !errors.length;

  return (
    <div id="thread" ref={scrollRef} onScroll={onScroll}>
      <div className="conversation-inner" ref={innerRef}>
        {empty && (
          <div className="empty rise-enter">
            <span className="empty-mark"><Icon name="terminal" size={26} /></span>
            <div className="empty-title">需要我做什么?</div>
            <div className="starters">
              {STARTERS.map((starter) => (
                <button key={starter.icon} className="starter" onClick={() => onStarter(starter.text)}>
                  <span className="starter-in">
                    <span className="starter-ic"><Icon name={starter.icon} size={15} /></span>
                    <span className="starter-text">{starter.text}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {loadingMore && <span className="sys-chip">正在加载更早的消息</span>}
        {!loadingMore && hasMore && renderRows.length > 0 && (
          <span className="sys-chip" style={{ opacity: .7 }}>上滚加载更早的消息</span>
        )}

        {blocks.map((block) => {
          if (block.kind === 'day') return <span key={block.key} className="day-chip">{block.label}</span>;
          if (block.kind === 'flat') return <TurnEntries key={block.key} items={block.items} />;
          if (block.kind === 'turn') {
            return (
              <div key={block.key} className={`cmsg relay${block.forgotten ? ' forgotten' : ''}`}>
                <TurnCollapse durationMs={block.durationMs}>
                  <TurnEntries items={block.items} inTurn />
                </TurnCollapse>
              </div>
            );
          }
          if (block.kind === 'user') {
            return (
              <div key={block.key} className={`cmsg client${block.row.forgotten ? ' forgotten' : ''}`}>
                <div className="cbubble">
                  {block.row.images.length > 0 && (
                    <div className="bubble-imgs">
                      {block.row.images.map((url, index) => <img key={index} src={url} alt="" loading="lazy" />)}
                    </div>
                  )}
                  {block.row.text && <div>{block.row.text}</div>}
                </div>
              </div>
            );
          }
          if (block.kind === 'runtime') {
            const open = opened.has(block.key);
            return (
              <button
                key={block.key}
                className={`sys-chip sys-event${open ? ' open' : ''}${block.row.forgotten ? ' forgotten' : ''}`}
                title={open ? '收起' : '展开'}
                onClick={() => setOpened((was) => {
                  const next = new Set(was);
                  if (!next.delete(block.key)) next.add(block.key);
                  return next;
                })}
              >
                {block.row.text}
              </button>
            );
          }
          return <FinalText key={block.key} row={block.row} always={block.key === lastFinalKey && !busy} />;
        })}

        {showWorking && (
          <div className="cmsg relay rise-enter">
            <WorkingLine />
          </div>
        )}

        {errors.map((err) => (
          <div key={err.id} className="error-banner">
            <span>{err.message}</span>
            <button className="error-close" onClick={() => onDismissError(err.id)} title="关闭">×</button>
          </div>
        ))}
      </div>
    </div>
  );
});
