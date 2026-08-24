// Yahoo Finance 非官方接口 — 主要股指 + 大宗商品 + 主要汇率
// 用 spark endpoint 一次拿到当前价 + 1d intraday sparkline
const SYMBOLS = [
  // 股指
  { symbol: "^GSPC",  label: "标普 500",   region: "US" },
  { symbol: "^IXIC",  label: "纳斯达克",   region: "US" },
  { symbol: "^DJI",   label: "道琼斯",     region: "US" },
  { symbol: "^N225",  label: "日经",       region: "JP" },
  { symbol: "^HSI",   label: "恒生",       region: "HK" },
  { symbol: "000001.SS", label: "上证",    region: "CN" },
  { symbol: "^FTSE",  label: "富时 100",   region: "UK" },
  { symbol: "^GDAXI", label: "DAX",        region: "DE" },
  // 大宗商品
  { symbol: "GC=F",   label: "黄金",       region: "金属" },
  { symbol: "SI=F",   label: "白银",       region: "金属" },
  { symbol: "CL=F",   label: "WTI 原油",   region: "能源" },
  { symbol: "BZ=F",   label: "布伦特",     region: "能源" },
  { symbol: "ZW=F",   label: "小麦",       region: "农产" },
  // 汇率
  { symbol: "DX-Y.NYB", label: "美元指数", region: "汇率" },
  { symbol: "CNY=X",  label: "USD/CNY",    region: "汇率" },
  { symbol: "EURUSD=X", label: "EUR/USD",  region: "汇率" }
];

let cache = { at: 0, data: null };
const TTL = 60 * 1000;

export const fetchMarkets = async () => {
  if (cache.data && Date.now() - cache.at < TTL) return cache.data;
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(SYMBOLS.map((s) => s.symbol).join(","))}&range=1d&interval=15m&indicators=close&includeTimestamps=false`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AIOS-Civ/1.0)",
      Accept: "application/json"
    }
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status}`);
  const data = await res.json();
  const items = SYMBOLS.map((s) => {
    const r = data?.spark?.result?.find((x) => x.symbol === s.symbol);
    if (!r) return null;
    const meta = r.response?.[0]?.meta || {};
    const closes = (r.response?.[0]?.indicators?.quote?.[0]?.close || []).filter((v) => v != null);
    const last = closes[closes.length - 1] ?? meta.regularMarketPrice;
    const prev = meta.previousClose ?? meta.chartPreviousClose;
    const change = last && prev ? ((last - prev) / prev) * 100 : 0;
    return {
      symbol: s.symbol,
      label: s.label,
      region: s.region,
      price: last,
      change,
      series: closes.length > 1 ? closes : (last ? [last] : [])
    };
  }).filter(Boolean);
  cache = { at: Date.now(), data: items };
  return items;
};
