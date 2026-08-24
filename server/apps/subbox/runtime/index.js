import { getConfig, claimRun, resetLastRunDate } from "../repository/config.js";
import { hhmmLocal, todayLocal } from "../repository/client.js";
import { getApiToken } from "../../app_shared/apiToken.js";
import { runOnce } from "./run.js";

const TICK_MS = 30 * 1000;
let timer = null;
let executing = false;

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

const dispatch = (cfg) => {
  if (executing) return;
  executing = true;
  runOnce(cfg).finally(() => { executing = false; });
};

const tick = () => {
  const cfg = getConfig();
  if (!cfg.enabled) return;
  if (!cfg.topic) return;
  const today = todayLocal();
  if (cfg.last_run_date === today) return;
  if (String(cfg.schedule_time || "") > hhmmLocal()) return;
  if (!claimRun(today)) return;
  dispatch(cfg);
};

const initRuntime = async () => {
  if (timer) return;
  timer = setInterval(() => {
    try { tick(); } catch (e) { console.error("[subbox]", e.message); }
  }, TICK_MS);
  waitForMain().then((ok) => {
    if (ok) {
      try { tick(); } catch (e) { console.error("[subbox]", e.message); }
    }
  });
};

const triggerNow = async () => {
  const cfg = getConfig();
  if (!cfg.topic) throw new Error("请先填写订阅主题");
  if (executing) return { running: true };
  resetLastRunDate();
  if (!claimRun(todayLocal())) return { running: true };
  executing = true;
  runOnce(cfg).finally(() => { executing = false; });
  return { running: true };
};

const isRunning = () => executing;

export { initRuntime, triggerNow, isRunning };
