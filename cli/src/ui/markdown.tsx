// 终端里的 markdown。只做模型真会输出的那几种:围栏代码块、行内代码、粗体斜体、
// 标题、列表、引用、分隔线。其余原样。
//
// 流式是这里唯一的难点:正文随时可能停在半个 ``` 里。所以围栏「开了没闭」就按
// 开着渲染 —— 等闭合再上色会让代码块先以正文形态闪一下。
import { Box, Text } from 'ink';

const FENCE = /^\s*```(\S*)\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^(\s*)([-*+])\s+(.*)$/;
const ORDERED = /^(\s*)(\d+[.)])\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const TABLE_SEP = /^\s*\|(\s*:?-+:?\s*\|)+\s*$/;

// 终端里没有排版引擎,列宽只能自己量:'中'.length 是 1 却占 2 列,
// '📊'.length 是 2 也占 2 列 —— 用 length 两个方向都错。
const WIDE = [
  [0x1100, 0x115f], [0x2e80, 0x303e], [0x3041, 0x33ff], [0x3400, 0x4dbf],
  [0x4e00, 0x9fff], [0xa000, 0xa4cf], [0xac00, 0xd7a3], [0xf900, 0xfaff],
  [0xfe10, 0xfe19], [0xfe30, 0xfe6f], [0xff00, 0xff60], [0xffe0, 0xffe6],
  [0x1f300, 0x1f9ff], [0x1fa70, 0x1faff], [0x20000, 0x3fffd],
];
const ZERO = [[0x0300, 0x036f], [0x200b, 0x200f], [0xfe00, 0xfe0f]];
const inRanges = (code: number, ranges: number[][]) => ranges.some(([lo, hi]) => code >= lo && code <= hi);

export function width(text: string): number {
  let total = 0;
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (inRanges(code, ZERO)) continue;
    total += inRanges(code, WIDE) ? 2 : 1;
  }
  return total;
}

const pad = (n: number) => ' '.repeat(Math.max(0, n));
const splitCells = (line: string) => line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((cell) => cell.trim());

type Align = 'left' | 'center' | 'right';

function alignments(sep: string): Align[] {
  return splitCells(sep).map((cell) => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    return left && right ? 'center' : right ? 'right' : 'left';
  });
}

function Cell({ text, size, align, bold, keyBase }: { text: string; size: number; align: Align; bold?: boolean; keyBase: string }) {
  const slack = size - width(text);
  const left = align === 'right' ? slack : align === 'center' ? Math.floor(slack / 2) : 0;
  return (
    <Text bold={bold}>{pad(left)}{inline(text, keyBase)}{pad(slack - left)}</Text>
  );
}

/** 画一张表。列宽按显示宽度算,放不下就退回原始文本 —— 错位的表比不画更难读。 */
function Table({ head, body, align, keyBase }: { head: string[]; body: string[][]; align: Align[]; keyBase: string }) {
  const columns = head.length;
  const sizes = head.map((cell, i) => Math.max(width(cell), ...body.map((row) => width(row[i] ?? ''))));
  const total = sizes.reduce((sum, size) => sum + size + 3, 1);
  if (total > (process.stdout.columns || 80)) {
    return (
      <Box flexDirection="column">
        {[head, ...body].map((row, i) => <Text key={i} dimColor>{row.join(' · ')}</Text>)}
      </Box>
    );
  }
  const line = (left: string, mid: string, right: string) => left + sizes.map((size) => '─'.repeat(size + 2)).join(mid) + right;
  return (
    <Box flexDirection="column">
      <Text dimColor>{line('┌', '┬', '┐')}</Text>
      <Text>
        <Text dimColor>│ </Text>
        {head.map((cell, i) => (
          <Text key={i}><Cell text={cell} size={sizes[i]} align={align[i] ?? 'left'} bold keyBase={`${keyBase}-h${i}`} /><Text dimColor> │ </Text></Text>
        ))}
      </Text>
      <Text dimColor>{line('├', '┼', '┤')}</Text>
      {body.map((row, r) => (
        <Text key={r}>
          <Text dimColor>│ </Text>
          {Array.from({ length: columns }, (_, i) => (
            <Text key={i}><Cell text={row[i] ?? ''} size={sizes[i]} align={align[i] ?? 'left'} keyBase={`${keyBase}-r${r}c${i}`} /><Text dimColor> │ </Text></Text>
          ))}
        </Text>
      ))}
      <Text dimColor>{line('└', '┴', '┘')}</Text>
    </Box>
  );
}

/** 行内:`代码` **粗** *斜* [文字](链接)。按出现顺序切,不做嵌套。 */
function inline(text: string, key: string) {
  const parts: React.ReactNode[] = [];
  const pattern = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*|_[^_\n]+_)|(\[[^\]\n]+\]\([^)\n]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(<Text key={`${key}-t${index++}`}>{text.slice(last, match.index)}</Text>);
    const token = match[0];
    if (token.startsWith('`')) {
      parts.push(<Text key={`${key}-c${index++}`} color="cyan">{token.slice(1, -1)}</Text>);
    } else if (token.startsWith('**')) {
      parts.push(<Text key={`${key}-b${index++}`} bold>{token.slice(2, -2)}</Text>);
    } else if (token.startsWith('[')) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token) ?? [];
      parts.push(<Text key={`${key}-l${index++}`}>{label}<Text dimColor> {href}</Text></Text>);
    } else {
      parts.push(<Text key={`${key}-i${index++}`} italic>{token.slice(1, -1)}</Text>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(<Text key={`${key}-t${index++}`}>{text.slice(last)}</Text>);
  return parts.length ? parts : [<Text key={`${key}-empty`}> </Text>];
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let fence: { lang: string; lines: string[] } | null = null;
  let skipTo = -1;

  const flushFence = (key: string) => {
    if (!fence) return;
    blocks.push(
      <Box key={key} flexDirection="column" paddingLeft={2}>
        {fence.lang ? <Text dimColor>{fence.lang}</Text> : null}
        {fence.lines.map((line, i) => <Text key={i} color="green">{line || ' '}</Text>)}
      </Box>,
    );
    fence = null;
  };

  lines.forEach((line, i) => {
    const key = `l${i}`;
    if (i <= skipTo) return;
    const fenceMark = FENCE.exec(line);
    if (fenceMark) {
      if (fence) flushFence(key);
      else fence = { lang: fenceMark[1] ?? '', lines: [] };
      return;
    }
    if (fence) { fence.lines.push(line); return; }

    // 表格:要等分隔行到了才认。只有表头时按普通文本走,免得流式过程里先画半张表再重排。
    if (TABLE_ROW.test(line) && TABLE_SEP.test(lines[i + 1] ?? '')) {
      const align = alignments(lines[i + 1]);
      const body: string[][] = [];
      let cursor = i + 2;
      while (cursor < lines.length && TABLE_ROW.test(lines[cursor])) body.push(splitCells(lines[cursor++]));
      skipTo = cursor - 1;
      blocks.push(<Table key={key} head={splitCells(line)} body={body} align={align} keyBase={key} />);
      return;
    }

    const heading = HEADING.exec(line);
    if (heading) { blocks.push(<Text key={key} bold color="magenta">{heading[2]}</Text>); return; }

    if (RULE.test(line)) { blocks.push(<Text key={key} dimColor>{'─'.repeat(24)}</Text>); return; }

    const quote = QUOTE.exec(line);
    if (quote) {
      blocks.push(<Text key={key} dimColor>{'│ '}{quote[1]}</Text>);
      return;
    }

    const bullet = BULLET.exec(line);
    if (bullet) {
      blocks.push(<Text key={key}>{bullet[1]}<Text color="cyan">· </Text>{inline(bullet[3], key)}</Text>);
      return;
    }

    const ordered = ORDERED.exec(line);
    if (ordered) {
      blocks.push(<Text key={key}>{ordered[1]}<Text color="cyan">{ordered[2]} </Text>{inline(ordered[3], key)}</Text>);
      return;
    }

    blocks.push(<Text key={key}>{inline(line, key)}</Text>);
  });

  flushFence('tail'); // 没闭合的围栏照样按代码块渲染

  return <Box flexDirection="column">{blocks}</Box>;
}
