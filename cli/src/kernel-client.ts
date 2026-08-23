// 逃生通道:App 起不来时直连 Kernel。没有库、没有压缩,历史只在内存里,
// 退出即忘 —— 它的用途是把 App 修回来,不是长期用。
import { cachedOf, Emitter, sseEvents, toolLabel } from './protocol.js';
import type { Client, Item, Row } from './protocol.js';
import type { Config } from './config.js';

const RUN_OPTION_KEYS = ['model', 'workdir', 'bashMinTimeoutMs', 'bashDefaultTimeoutMs',
  'bashTimeoutMs', 'toolTimeoutMs', 'toolOutputMaxChars', 'guardTimeoutMs'] as const;

export class KernelClient extends Emitter implements Client {
  readonly label: string;
  chatId = '';
  private items: Item[] = [];
  private running = false;
  private totals = { input: 0, cached: 0, output: 0 }; // 没有库,只能自己加

  constructor(private config: Config) {
    super();
    this.label = `${config.kernelBase.replace('/api', '')} · 直连`;
  }

  async open() {
    this.chatId = `cli-${Math.random().toString(36).slice(2, 10)}`;
  }

  async history(): Promise<Row[]> { return []; }

  private options() {
    const source = this.config as Record<string, any>;
    const out: Record<string, unknown> = {};
    for (const key of RUN_OPTION_KEYS) if (source[key] !== undefined && source[key] !== '') out[key] = source[key];
    if (this.config.model) out.model = this.config.model;
    return out;
  }

  async send(text: string) {
    if (this.running) { this.emit('error', '还在跑,先停下'); return; }
    const input: Item = { type: 'message', role: 'user', content: [{ type: 'input_text', text }] };
    this.items.push(input);
    this.running = true;
    this.emit('status', true);
    try {
      const res = await fetch(`${this.config.kernelBase}/runs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ runId: this.chatId, options: this.options(), input: this.items, state: {} }),
      });
      if (!res.ok || !res.body) throw new Error((await res.text().catch(() => '')) || `Kernel ${res.status}`);
      for await (const { type, data } of sseEvents(res.body as any)) {
        if (type === 'message' && data.delta) this.emit('message', data.delta);
        else if (type === 'reasoning' && data.delta) this.emit('reasoning', data.delta);
        else if (type === 'item' && data.item) {
          this.items.push(data.item); // 攒着,下一轮连同新输入一起发回去
          if (data.item.type === 'function_call') this.emit('tool', toolLabel(data.item));
          if (data.usage) {
            this.emit('usage', data.usage);
            this.totals.input += Number(data.usage.input_tokens) || 0;
            this.totals.cached += cachedOf(data.usage);
            this.totals.output += Number(data.usage.output_tokens) || 0;
            this.emit('totals', { ...this.totals });
          }
        } else if (type === 'tool_result' && data.item) {
          this.items.push(data.item);
          this.emit('tool-result', { callId: String(data.item.call_id ?? ''), text: String(data.item.output ?? '') });
        } else if (type === 'error') this.emit('error', String(data.message ?? '未知错误'));
      }
    } catch (err) {
      this.emit('error', (err as Error).message);
    } finally {
      this.running = false;
      this.emit('status', false);
    }
  }

  async stop() {
    await fetch(`${this.config.kernelBase}/runs/${this.chatId}/stop`, { method: 'POST' }).catch(() => {});
  }

  async reset() {
    this.items = [];
    this.totals = { input: 0, cached: 0, output: 0 };
    this.emit('totals', { ...this.totals });
    await this.open();
  }

  close() { /* 无长连接 */ }
}
