import { getConfig } from "../repository/config.js";
import { fetchSpotTickers } from "../runtime/okx.js";

const MAJOR_INST_IDS = [
  "BTC-USDT",
  "ETH-USDT",
  "SOL-USDT",
  "BNB-USDT",
  "XRP-USDT",
  "DOGE-USDT",
  "ADA-USDT",
  "AVAX-USDT",
  "LINK-USDT",
  "TON-USDT",
  "TRX-USDT",
  "LTC-USDT",
  "BCH-USDT"
];

const toNum = (value) => Number(value || 0) || 0;

const normalizeTicker = (row) => {
  const last = toNum(row.last);
  const open24h = toNum(row.open24h);
  const change = open24h > 0 ? last - open24h : 0;
  const changeRatio = open24h > 0 ? change / open24h : 0;
  return {
    instId: row.instId,
    base: String(row.instId || "").split("-")[0] || row.instId,
    quote: "USDT",
    last,
    askPx: toNum(row.askPx),
    bidPx: toNum(row.bidPx),
    open24h,
    high24h: toNum(row.high24h),
    low24h: toNum(row.low24h),
    vol24h: toNum(row.vol24h),
    volCcy24h: toNum(row.volCcy24h),
    change,
    changeRatio,
    ts: row.ts || ""
  };
};

const getMarket = async () => {
  const cfg = getConfig();
  try {
    const rows = await fetchSpotTickers(cfg.base_url || "https://www.okx.com");
    const byId = new Map(rows.map((row) => [row.instId, row]));
    const items = MAJOR_INST_IDS
      .map((instId) => byId.get(instId))
      .filter(Boolean)
      .map(normalizeTicker);
    return {
      success: true,
      items,
      updatedAt: new Date().toISOString()
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
};

export { getMarket };
