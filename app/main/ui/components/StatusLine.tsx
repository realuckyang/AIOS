// 输入框下的状态行:模型 · 累计花费 · 上下文水位。
//
// 只摆两个数:花费(累计,按当前价折算的估算)与水位(上轮请求 input+output)。
// 累计 token 曾并排显示,但每轮重发全上下文使它随轮数近似平方增长,
// 与水位并排时极易被误读成「现在发给模型的上下文」——两者语义完全不同。
// 故累计 token 收进花费的悬浮提示,主位不再摆。
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
      {(priceIn > 0 || priceOut > 0) && (
        <span
          className="sl-item"
          title={`对话累计花费 —— 按当前价折算的估算,不是账单\n累计输入 ${fmt(inputSum)}(命中缓存 ${fmt(cachedSum)}) · 累计输出 ${fmt(outputSum)}\n单价:输入 ${currency}${priceIn}/M · 缓存 ${currency}${priceCached}/M · 输出 ${currency}${priceOut}/M`}
        >
          {currency}{cost >= 0.1 ? cost.toFixed(2) : cost.toFixed(4)}
        </span>
      )}
      {window > 0 && (
        <span className="sl-item" title={`上下文水位:上轮请求实测 ${level} / 窗口 ${window} tokens(${pct}%)\n这是「下一轮大约发多少」,与左侧累计花费口径不同`}>
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
