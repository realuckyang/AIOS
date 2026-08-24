import crypto from "crypto";
import { nowIso } from "../repository/client.js";
const signOkx = ({ ts, method, path, body, secret }) => {
  const prehash = `${ts}${method.toUpperCase()}${path}${body || ""}`;
  return crypto.createHmac("sha256", secret).update(prehash).digest("base64");
};
const okxRequest = async (cfg, method, path, payload = null) => {
  const ts = nowIso();
  const body = payload ? JSON.stringify(payload) : "";
  const sign = signOkx({ ts, method, path, body, secret: cfg.api_secret });
  const resp = await fetch(`${cfg.base_url}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "OK-ACCESS-KEY": cfg.api_key,
      "OK-ACCESS-SIGN": sign,
      "OK-ACCESS-TIMESTAMP": ts,
      "OK-ACCESS-PASSPHRASE": cfg.passphrase
    },
    body: body || void 0
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data.code !== "0") throw new Error(`OKX: ${data?.msg || resp.status}`);
  return data;
};

const okxPublicRequest = async (baseUrl, path) => {
  const resp = await fetch(`${baseUrl || "https://www.okx.com"}${path}`);
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data.code !== "0") throw new Error(`OKX: ${data?.msg || resp.status}`);
  return data;
};

const fetchAccountTotalEq = async (cfg) => {
  const data = await okxRequest(cfg, "GET", "/api/v5/account/balance");
  return Number(data?.data?.[0]?.totalEq || 0) || 0;
};

const fetchSpotTickers = async (baseUrl) => {
  const data = await okxPublicRequest(baseUrl, "/api/v5/market/tickers?instType=SPOT");
  return Array.isArray(data?.data) ? data.data : [];
};

// Full account balance for each currency.
const fetchBalances = async (cfg) => {
  const data = await okxRequest(cfg, "GET", "/api/v5/account/balance");
  const acct = data?.data?.[0] || {};
  const details = Array.isArray(acct.details) ? acct.details : [];
  return {
    totalEq: Number(acct.totalEq || 0),
    isoEq: Number(acct.isoEq || 0),
    adjEq: Number(acct.adjEq || 0),
    details: details
      .map((d) => ({
        ccy: d.ccy,
        eq: Number(d.eq || 0),
        availEq: Number(d.availEq || 0),
        frozenBal: Number(d.frozenBal || 0),
        eqUsd: Number(d.eqUsd || 0),
        upl: Number(d.upl || 0),
      }))
      .filter((d) => d.eq > 0 || d.frozenBal > 0)
      .sort((a, b) => b.eqUsd - a.eqUsd),
  };
};

// Derivative positions.
const fetchPositions = async (cfg) => {
  const data = await okxRequest(cfg, "GET", "/api/v5/account/positions");
  const rows = Array.isArray(data?.data) ? data.data : [];
  return rows
    .filter((r) => Number(r.pos || 0) !== 0)
    .map((r) => ({
      instId: r.instId,
      instType: r.instType,
      posSide: r.posSide,
      pos: Number(r.pos || 0),
      avgPx: Number(r.avgPx || 0),
      lastPx: Number(r.last || 0),
      markPx: Number(r.markPx || 0),
      upl: Number(r.upl || 0),
      uplRatio: Number(r.uplRatio || 0),
      lever: Number(r.lever || 0),
      ccy: r.ccy,
      uTime: r.uTime,
    }));
};

// Historical orders. instType may be SPOT / SWAP / FUTURES / MARGIN / ANY.
const fetchOrderHistory = async (cfg, { instType = "ANY", limit = 50 } = {}) => {
  const path = `/api/v5/trade/orders-history?instType=${encodeURIComponent(instType)}&limit=${limit}`;
  const data = await okxRequest(cfg, "GET", path);
  const rows = Array.isArray(data?.data) ? data.data : [];
  return rows.map((r) => ({
    ordId: r.ordId,
    clOrdId: r.clOrdId,
    instId: r.instId,
    instType: r.instType,
    side: r.side,
    posSide: r.posSide,
    ordType: r.ordType,
    px: Number(r.px || 0),
    sz: Number(r.sz || 0),
    fillSz: Number(r.fillSz || 0),
    avgPx: Number(r.avgPx || 0),
    state: r.state,
    fee: Number(r.fee || 0),
    feeCcy: r.feeCcy,
    cTime: r.cTime,
    uTime: r.uTime,
  }));
};

export {
  fetchAccountTotalEq,
  fetchBalances,
  fetchSpotTickers,
  fetchPositions,
  fetchOrderHistory,
  okxRequest
};
