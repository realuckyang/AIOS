// 输入框下的状态行:模型 · 输入 · 缓存 · 输出 · 水位 · 花费。
//
// 输入/缓存/输出 = getChat 聚合的对话累计,计费口径(每轮都重发全上下文);
// 水位 = 上轮请求的 input+output(下一轮输入 ≈ 这个数),是实测值不是估算;
// 花费 = 累计 × 设置里的当前价格 —— 历史轮按现价折算,是估算不是账单。
// 输入里命中缓存的部分按缓存价单算(未配缓存价则不打折按输入价)。
import { memo, useEffect, useState } from 'react';
import * as api from '../api';
import type { ChatMeta, Row } from '../types';

const fmt = (value: number) =>
  value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}m`
  : value >= 1_000 ? `${(value / 1_000).toFixed(1)}k`
  : String(value);

export const StatusLine = memo(function StatusLine({ items, meta }: { items: Row[]; meta: ChatMeta | null }) {
  const [config, setConfig] = useState<Record<string, string | number> | null>(null);
  useEffect(() => {
    api.getConfig().then((schema) => setConfig(schema.values)).catch(() => { /* 拿不到配置就少显示几段 */ });
  }, []);

  const last = [...items].reverse().find((row) => row.usage)?.usage;
  if (!meta || !last) return null;

  const window = Number(config?.contextWindowTokens) || 0;
  const level = (last.input_tokens ?? 0) + (last.output_tokens ?? 0);
  const pct = window > 0 ? Math.min(100, Math.round((level / window) * 100)) : 0;
  const tone = pct >= 90 ? 'bad' : pct >= 70 ? 'warn' : 'ok';

  const inputSum = meta.usage_input ?? 0;
  const outputSum = meta.usage_output ?? 0;
  const cachedSum = Math.min(meta.usage_cached ?? 0, inputSum);
  const priceIn = Number(config?.priceInputPerMTokens) || 0;
  const priceOut = Number(config?.priceOutputPerMTokens) || 0;
  const priceCached = Number(config?.priceCachedPerMTokens) > 0 ? Number(config!.priceCachedPerMTokens) : priceIn;
  const currency = String(config?.priceCurrency || '¥');
  const cost = ((inputSum - cachedSum) / 1e6) * priceIn + (cachedSum / 1e6) * priceCached + (outputSum / 1e6) * priceOut;

  return (
    <div className="statusline">
      {config?.model && <span className="sl-model">{config.model}</span>}
      <span className="sl-item" title="对话累计输入 tokens(计费口径,含缓存命中)">输入 {fmt(inputSum)}</span>
      <span className="sl-item" title="输入中命中提示缓存的部分">缓存 {fmt(cachedSum)}</span>
      <span className="sl-item" title="对话累计输出 tokens">输出 {fmt(outputSum)}</span>
      {(priceIn > 0 || priceOut > 0) && (
        <span className="sl-item" title={`按当前价估算:输入 ${currency}${priceIn}/M · 缓存 ${currency}${priceCached}/M · 输出 ${currency}${priceOut}/M`}>
          {currency}{cost >= 0.1 ? cost.toFixed(2) : cost.toFixed(4)}
        </span>
      )}
      {window > 0 && (
        <span className="sl-item" title={`上下文水位:上轮请求 ${level} / 窗口 ${window} tokens(${pct}%)`}>
          <svg className={`sl-ring ${tone}`} width="13" height="13" viewBox="0 0 13 13" aria-hidden>
            <circle className="sl-ring-track" cx="6.5" cy="6.5" r="5" />
            <circle
              className="sl-ring-fill"
              cx="6.5" cy="6.5" r="5"
              strokeDasharray={`${(Math.max(4, pct) / 100) * 31.42} 31.42`}
              transform="rotate(-90 6.5 6.5)"
            />
          </svg>
          <span>{fmt(level)}/{fmt(window)}</span>
        </span>
      )}
    </div>
  );
});
