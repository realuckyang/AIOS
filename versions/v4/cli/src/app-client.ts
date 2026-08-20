// 走 App:对话进库、和网页界面共享同一条历史、跨轮压缩由 App 负责。
// 事件从 /api/events 这条全局流来,按 chatId 过滤。
import { Emitter, rowsFromItems, sseEvents, toolLabel, itemText } from './protocol.js';
import type { Client, Row } from './protocol.js';
import type { Config } from './config.js';

export class AppClient extends Emitter implements Client {
  readonly label: string;
  chatId = '';
  private controller = new AbortController();

  constructor(private config: Config, private wanted: string) {
    super();
    this.label = config.appBase.replace('/api', '');
  }

  private async api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.config.appBase}${path}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error((await res.text().catch(() => '')) || `App ${res.status}`);
    return (res.status === 204 ? null : await res.json()) as T;
  }

  async open() {
    if (this.wanted) {
      await this.api('GET', `/chats/${this.wanted}`); // 不存在就抛,别静默新建
      this.chatId = this.wanted;
    } else {
      this.chatId = (await this.api<{ id: string }>('POST', '/chats', { title: '终端' })).id;
    }
    void this.listen();
    void this.refreshTotals();
  }

  async history(): Promise<Row[]> {
    if (!this.wanted) return [];
    return rowsFromItems(await this.api<Array<{ item: any }>>('GET', `/chats/${this.chatId}/items`));
  }

  // 断线自己重连:CLI 可能开着过夜,App 重启一次不该让它变哑巴。
  private async listen() {
    while (!this.controller.signal.aborted) {
      try {
        const res = await fetch(`${this.config.appBase}/events`, { signal: this.controller.signal });
        if (!res.ok || !res.body) throw new Error(`events ${res.status}`);
        for await (const { type, data } of sseEvents(res.body as any)) {
          if (data.chatId && data.chatId !== this.chatId) continue;
          this.dispatch(type, data);
        }
      } catch {
        if (this.controller.signal.aborted) return;
        this.emit('note', 'App 事件流断了,重连中…');
      }
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }

  private dispatch(type: string, data: any) {
    if (type === 'status') this.emit('status', data.status === 'running');
    else if (type === 'reasoning' && data.delta) this.emit('reasoning', data.delta);
    else if (type === 'message' && data.delta) this.emit('message', data.delta);
    else if (type === 'tool_calls' && data.row?.item) this.emit('tool', toolLabel(data.row.item));
    else if (type === 'tool_results' && data.row?.item) {
      this.emit('tool-result', { callId: String(data.row.item.call_id ?? ''), text: String(data.row.item.output ?? '') });
    } else if (type === 'message' && data.row?.usage) this.emit('usage', data.row.usage);
    else if (type === 'error') this.emit('error', String(data.message ?? '未知错误'));
    else if (type === 'done') { this.emit('status', false); void this.refreshTotals(); }
  }

  // 累计用量以库为准:App 在 usage 表里同事务维护,比客户端自己加更可靠,
  // 也让「接着已有对话聊」一进来就有正确的总数。
  private async refreshTotals() {
    try {
      const meta = await this.api<Record<string, number>>('GET', `/chats/${this.chatId}`);
      this.emit('totals', {
        input: Number(meta.usage_input) || 0,
        cached: Number(meta.usage_cached) || 0,
        output: Number(meta.usage_output) || 0,
      });
    } catch { /* 拿不到就维持上一次 */ }
  }

  async send(text: string) {
    await this.api('POST', `/chats/${this.chatId}/messages`, { source: 'user', content: text });
  }

  async stop() {
    await this.api('POST', `/chats/${this.chatId}/stop`).catch(() => {});
  }

  async reset() {
    this.chatId = (await this.api<{ id: string }>('POST', '/chats', { title: '终端' })).id;
    this.emit('totals', { input: 0, cached: 0, output: 0 });
  }

  close() { this.controller.abort(); }
}

export { itemText };
