// CLI 与两个后端之间的共同形状。两个客户端(App / Kernel)发出同一套事件,
// 界面因此不必知道自己连的是谁。
export type Item = { type: string; [key: string]: any };

export type Row =
  | { kind: 'user'; text: string }
  | { kind: 'assistant'; text: string; reasoning: string }
  | { kind: 'tool'; callId: string; name: string; args: string; result?: string; done: boolean }
  | { kind: 'system'; text: string; tone?: 'info' | 'warn' | 'error' };

export type Usage = { input_tokens?: number; output_tokens?: number; [key: string]: unknown };

/** 整段对话的累计用量(计费口径),和水位是两个口径:水位只看最近一次请求。 */
export type Totals = { input: number; cached: number; output: number };

export const cachedOf = (usage: Usage) =>
  Number((usage as any)?.input_tokens_details?.cached_tokens) || 0;

export type ClientEvents = {
  status: (busy: boolean) => void;
  reasoning: (delta: string) => void;
  message: (delta: string) => void;
  tool: (call: { callId: string; name: string; args: string }) => void;
  'tool-result': (result: { callId: string; text: string }) => void;
  usage: (usage: Usage) => void;
  totals: (totals: Totals) => void;
  note: (text: string) => void;
  error: (message: string) => void;
};

export interface Client {
  readonly label: string;
  readonly chatId: string;
  open(): Promise<void>;
  send(text: string): Promise<void>;
  stop(): Promise<void>;
  reset(): Promise<void>;
  close(): void;
  on<K extends keyof ClientEvents>(event: K, handler: ClientEvents[K]): void;
  history(): Promise<Row[]>;
}

/** 极简事件源:两个客户端共用,不引第三方 emitter。 */
export class Emitter {
  private handlers = new Map<string, Function[]>();
  on(event: string, handler: Function) {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
  }
  emit(event: string, ...args: unknown[]) {
    for (const handler of this.handlers.get(event) ?? []) {
      try { handler(...args); } catch { /* 界面出错不该拖垮流 */ }
    }
  }
}

/** 按空行切分 SSE,产出 { type, data }。两个后端都是这个格式。 */
export async function* sseEvents(body: AsyncIterable<Uint8Array>) {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    let index: number;
    while ((index = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      let type = '';
      let data: any = null;
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) type = line.slice(6).trim();
        if (line.startsWith('data:')) { try { data = JSON.parse(line.slice(5).trim()); } catch { data = null; } }
      }
      if (type && data) yield { type, data };
    }
  }
}

export function itemText(item: Item | null | undefined): string {
  const content = item?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((part: any) => (typeof part?.text === 'string' ? part.text : '')).join('');
  return '';
}

/** 从一次工具调用里抽出「一句话」:摘要 > 文件名 > 命令。 */
export function toolLabel(item: Item): { callId: string; name: string; args: string } {
  let raw: Record<string, any> = {};
  try { raw = JSON.parse(item.arguments || '{}'); } catch { /* 参数不是 JSON 就只显示工具名 */ }
  const one = String(raw.summary ?? '')
    || String(raw.path ?? '').split('/').filter(Boolean).pop()
    || String(raw.command ?? '');
  return { callId: String(item.call_id ?? ''), name: String(item.name ?? 'tool'), args: one };
}

/** 库里的一串 item 还原成转录行。 */
export function rowsFromItems(items: Array<{ item: Item }>): Row[] {
  const rows: Row[] = [];
  for (const { item } of items) {
    if (item.type === 'message' && item.role === 'user') rows.push({ kind: 'user', text: itemText(item) });
    else if (item.type === 'message') rows.push({ kind: 'assistant', text: itemText(item), reasoning: '' });
    else if (item.type === 'function_call') rows.push({ kind: 'tool', ...toolLabel(item), done: false });
    else if (item.type === 'function_call_output') {
      const target = [...rows].reverse().find((row) => row.kind === 'tool' && !row.done) as Extract<Row, { kind: 'tool' }> | undefined;
      if (target) { target.result = String(item.output ?? ''); target.done = true; }
    }
  }
  return rows;
}
