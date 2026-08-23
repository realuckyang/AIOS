// 「一个对话线」的渲染模型:把 App 的 items(Responses 形状)合成用户看得懂的行。
//
// 一步会产出好几条:思考、正文、每次工具调用各一条,工具结果又是独立一条。
// 渲染前先合回:工具结果回填到对应的调用行上,思考独立成行。
import type { Item, Row } from '../types';

export type RenderRow =
  | { kind: 'user'; key: string; at: string; forgotten: boolean; text: string; images: string[] }
  | { kind: 'runtime'; key: string; at: string; forgotten: boolean; text: string }
  | { kind: 'text'; key: string; at: string; forgotten: boolean; text: string; streaming?: boolean }
  | { kind: 'think'; key: string; at: string; forgotten: boolean; text: string; streaming?: boolean }
  | {
      kind: 'tool'; key: string; at: string; forgotten: boolean;
      name: string; summary: string; args: Record<string, unknown>;
      result: string; status: 'running' | 'done'; failed: boolean;
    };

function itemText(item: Item): string {
  const content = (item as { content?: unknown }).content;
  if (typeof content === 'string') return content;
  const parts = Array.isArray(content) ? content : [];
  const summary = (item as { summary?: Array<{ text?: string }> }).summary ?? [];
  return [...summary, ...parts].map((part) => String((part as { text?: string })?.text ?? '')).join('');
}

// 库里图片存的是 aios-file:// 引用(字节在 var/files),渲染时换成取回端点给 <img>;
// data:/http(s) 原样(旧数据或外链)。
function imageSrc(url: string): string {
  return url.startsWith('aios-file://') ? `/api/files/${encodeURIComponent(url.slice('aios-file://'.length))}` : url;
}

function itemImages(item: Item): string[] {
  const content = (item as { content?: unknown }).content;
  const parts = Array.isArray(content) ? content : [];
  return parts
    .filter((part) => (part as { type?: string })?.type === 'input_image')
    .map((part) => String((part as { image_url?: string }).image_url ?? ''))
    .filter(Boolean)
    .map(imageSrc);
}

function safeParse(raw = ''): Record<string, unknown> {
  try {
    const value = JSON.parse(raw || '{}');
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  } catch { return {}; }
}

/** 失败判定:结果带 error,或 exit_code 非零。处理是整行淡掉,不另立红旗。 */
function isFailed(result: string): boolean {
  if (!result) return false;
  const parsed = safeParse(result);
  if (parsed.error) return true;
  return typeof parsed.exit_code === 'number' && parsed.exit_code !== 0;
}

/** 展开的「输入」:summary 已在标题展示过,这里去掉,只留真正的参数。 */
export function fmtArgs(args: Record<string, unknown>): string {
  const { summary: _summary, ...rest } = args;
  try { return JSON.stringify(rest, null, 2); } catch { return String(args); }
}

/** 「输出」:结果常是被压成一行的 JSON,能解析就缩进展示,否则原样。 */
export function fmtResult(value: string): string {
  if (!value) return '';
  try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
}

/** 消息流里的「今天/昨天/日期」分隔标签。 */
export function dayLabel(at?: string): string {
  if (!at) return '';
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return '';
  const startOf = (item: Date) => new Date(item.getFullYear(), item.getMonth(), item.getDate()).getTime();
  const diff = Math.round((startOf(new Date()) - startOf(date)) / 86_400_000);
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/** ≥60s 显示 "NmSs",<60s 显示 "Ns";最小 1s。 */
export function formatDuration(ms: number): string {
  const totalSec = Math.max(1, Math.round(ms / 1000));
  if (totalSec < 60) return `${totalSec}s`;
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return seconds > 0 ? `${minutes}m${seconds}s` : `${minutes}m`;
}

export function buildRows(items: Row[], contextStart: number): RenderRow[] {
  const output: RenderRow[] = [];
  const callRows = new Map<string, Extract<RenderRow, { kind: 'tool' }>>();

  for (const row of items) {
    const { item } = row;
    const key = `r${row.seq}`;
    const base = { key, at: row.at, forgotten: row.seq <= contextStart };

    if (item.type === 'message') {
      const text = itemText(item);
      if (row.source === 'user') output.push({ ...base, kind: 'user', text, images: itemImages(item) });
      else if (row.source === 'runtime') output.push({ ...base, kind: 'runtime', text });
      else if (text.trim()) output.push({ ...base, kind: 'text', text });
      continue;
    }

    if (item.type === 'reasoning') {
      const text = itemText(item).trim();
      // 供应商不回思考内容时整行略过,不摆占位
      if (text) output.push({ ...base, kind: 'think', text });
      continue;
    }

    if (item.type === 'function_call') {
      const args = safeParse(item.arguments);
      const toolRow: Extract<RenderRow, { kind: 'tool' }> = {
        ...base,
        kind: 'tool',
        name: item.name || 'tool',
        summary: typeof args.summary === 'string' ? args.summary.trim() : '',
        args,
        result: '',
        status: 'running',
        failed: false,
      };
      if (item.call_id) callRows.set(item.call_id, toolRow);
      output.push(toolRow);
      continue;
    }

    if (item.type === 'function_call_output') {
      const callRow = item.call_id ? callRows.get(item.call_id) : undefined;
      if (callRow) {
        callRow.result = item.output || '';
        callRow.status = 'done';
        callRow.failed = isFailed(callRow.result);
      } else {
        // 发起它的调用被压缩切掉了 —— 单独显示一行,别把结果吞掉
        output.push({
          ...base, kind: 'tool', name: 'tool', summary: '', args: {},
          result: item.output || '', status: 'done', failed: isFailed(item.output || ''),
        });
      }
      continue;
    }

    // 未知 item 类型:折成一行原样展示,别渲染崩
    output.push({ ...base, kind: 'runtime', text: JSON.stringify(item) });
  }

  return output;
}
