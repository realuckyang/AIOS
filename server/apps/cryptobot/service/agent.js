import { getConfig, saveConfig } from "../repository/config.js";
import { getState } from "../repository/state.js";
import { getTodayChange } from "../repository/equity.js";
import { parseNum } from "../repository/client.js";
import { fetchAccountTotalEq } from "../runtime/okx.js";
import { isBotExecuting } from "../runtime/index.js";
import { okxRequest } from "../runtime/okx.js";
import { startBot, stopBot } from "../runtime/index.js";

const getAgent = async () => {
  const cfg = getConfig();
  const state = getState();
  let equity = parseNum(cfg.current_equity);
  if (cfg.api_key && cfg.api_secret && cfg.passphrase) {
    try {
      const liveEq = await fetchAccountTotalEq(cfg);
      if (liveEq > 0) {
        equity = liveEq;
        saveConfig({ current_equity: liveEq });
      }
    } catch {
    }
  }
  const initialEq = parseNum(cfg.initial_equity, equity) || 1;
  const pnl = equity - initialEq;
  return {
    success: true,
    config: {
      base_url: cfg.base_url,
      api_key: cfg.api_key || "",
      api_secret: cfg.api_secret || "",
      passphrase: cfg.passphrase || "",
      has_keys: Boolean(cfg.api_key && cfg.api_secret && cfg.passphrase),
      goal: cfg.goal || "",
      interval_sec: cfg.interval_sec,
      updated_at: cfg.updated_at
    },
    state: {
      running: Boolean(state.running),
      executing: isBotExecuting(),
      tick_count: state.tick_count || 0,
      started_at: state.started_at,
      last_run_at: state.last_run_at,
      last_error: state.last_error || null,
      last_error_at: state.last_error_at || null
    },
    equity: {
      current: equity,
      initial: parseNum(cfg.initial_equity),
      pnl,
      pnl_ratio: pnl / initialEq,
      today_change: getTodayChange(equity)
    }
  };
};

const saveAgent = (body = {}) => {
  const cfg = getConfig();
  const apiKey = String(body.api_key ?? "").trim();
  const apiSecret = String(body.api_secret ?? "").trim();
  const passphrase = String(body.passphrase ?? "").trim();
  const goal = String(body.goal || "").trim();
  if (!apiKey || !apiSecret || !passphrase) {
    throw new Error("API Key, Secret, and Passphrase are required");
  }
  saveConfig({
    base_url: String(cfg.base_url || "").trim(),
    api_key: apiKey,
    api_secret: apiSecret,
    passphrase,
    goal
  });
  return { success: true };
};

const testAgentExchange = async (body = {}) => {
  const saved = getConfig();
  const cfg = {
    base_url: String(saved.base_url || "").trim(),
    api_key: String(body.api_key ?? "").trim(),
    api_secret: String(body.api_secret ?? "").trim(),
    passphrase: String(body.passphrase ?? "").trim()
  };
  if (!cfg.base_url || !cfg.api_key || !cfg.api_secret || !cfg.passphrase) {
    throw new Error("base_url, API Key, Secret, and Passphrase are required");
  }
  await okxRequest(cfg, "GET", "/api/v5/account/balance");
  return { success: true, message: "连接成功" };
};

const startAgent = async (body = {}) => {
  const cfg = getConfig();
  const equity = await fetchAccountTotalEq(cfg);
  saveConfig({
    initial_equity: equity,
    current_equity: equity
  });
  startBot(body.interval_sec);
  return { success: true };
};

const stopAgent = () => {
  stopBot();
  return { success: true };
};

export {
  getAgent,
  saveAgent,
  startAgent,
  stopAgent,
  testAgentExchange
};
