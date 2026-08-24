import { nowIso } from "../repository/client.js";
import { getConfig, saveConfig } from "../repository/config.js";
import { getState, saveState } from "../repository/state.js";
import { runTradingCycle } from "./cycle/run.js";
import { getApiToken } from "../../app_shared/apiToken.js";
let timer = null;
let executing = false;

// Wait for the main process on 9502. The apps process is usually spawned at
// the same time, so the first tick can otherwise hit ECONNREFUSED.
const waitForMain = async (timeoutMs = 30000) => {
  const port = process.env.AIOS_MAIN_PORT || 9502;
  const token = getApiToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`http://localhost:${port}/api/health`, { headers });
      if (r.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
};
const runBotOnce = async () => {
  if (!getState().running) return;
  executing = true;
  try {
    await runTradingCycle();
  } finally {
    executing = false;
    const state = getState();
    saveState({ ...state, last_run_at: nowIso() });
  }
};
const startBot = (intervalSec, { runImmediately = true } = {}) => {
  const cfg = getConfig();
  if (!cfg.api_key || !cfg.api_secret || !cfg.passphrase) {
    throw new Error("Configure OKX API Key/Secret/Passphrase first");
  }
  if (!cfg.goal) {
    throw new Error("Set a goal first");
  }
  const sec = Math.max(60, parseInt(intervalSec || cfg.interval_sec || 300));
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  saveConfig({ interval_sec: sec });
  const oldState = getState();
  saveState({ ...oldState, running: 1, started_at: nowIso(), tick_count: oldState.tick_count || 0 });
  const onError = (e) => {
    console.error("[cryptobot]", e.message);
    saveState({ ...getState(), last_error: e.message, last_error_at: nowIso() });
  };
  const scheduleNext = () => {
    timer = setTimeout(async () => {
      if (!getState().running) {
        timer = null;
        return;
      }
      try {
        await runBotOnce();
      } catch (e) {
        onError(e);
      }
      if (getState().running) {
        scheduleNext();
      } else {
        timer = null;
      }
    }, sec * 1e3);
  };
  if (runImmediately) {
    runBotOnce().catch((e) => onError(e)).finally(() => {
      if (getState().running) scheduleNext();
    });
  } else {
    scheduleNext();
  }
  return getState();
};
const stopBot = () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  return saveState({ ...getState(), running: 0 });
};
const initRuntime = async () => {
  const state = getState();
  if (!state.running) return;
  const cfg = getConfig();
  if (!(cfg.api_key && cfg.api_secret && cfg.passphrase && cfg.goal)) {
    saveState({ ...state, running: 0 });
    return;
  }
  // Clear previous startup errors so the UI does not keep showing stale state.
  saveState({ ...state, last_error: "", last_error_at: "" });
  // Wait for main health in the background before scheduling ticks.
  waitForMain().then((ok) => {
    if (!ok) {
      saveState({ ...getState(), last_error: "main service did not come up in time", last_error_at: nowIso() });
      return;
    }
    if (!getState().running) return;
    startBot(cfg.interval_sec, { runImmediately: false });
  });
};
const isBotExecuting = () => executing;
export {
  initRuntime,
  isBotExecuting,
  startBot,
  stopBot
};
