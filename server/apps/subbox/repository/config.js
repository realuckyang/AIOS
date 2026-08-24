import { db, nowIso, todayLocal } from "./client.js";

const HHMM = /^\d{2}:\d{2}$/;
const normalizeHHMM = (s) => {
  const v = String(s || "").trim();
  if (!HHMM.test(v)) return "08:00";
  const [h, m] = v.split(":").map((x) => parseInt(x, 10));
  if (!(h >= 0 && h < 24) || !(m >= 0 && m < 60)) return "08:00";
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const ensureRow = () => {
  const row = db.prepare("SELECT * FROM subbox_config WHERE id = 1").get();
  if (row) return row;
  db.prepare(`
    INSERT INTO subbox_config (id, topic, schedule_time, enabled, last_run_date, updated_at)
    VALUES (1, '', '08:00', 0, '', datetime('now'))
  `).run();
  return db.prepare("SELECT * FROM subbox_config WHERE id = 1").get();
};

const getConfig = () => ensureRow();

const saveConfig = (patch = {}) => {
  const cur = ensureRow();
  const next = {
    topic: patch.topic !== undefined ? String(patch.topic || "").trim() : cur.topic,
    schedule_time: patch.schedule_time !== undefined ? normalizeHHMM(patch.schedule_time) : cur.schedule_time,
    enabled: patch.enabled !== undefined ? (patch.enabled ? 1 : 0) : cur.enabled
  };
  // 第一次激活订阅(从空 topic 变非空)时,把 last_run_date 设为今天,避免老时间立刻触发
  let lastRunDate = cur.last_run_date;
  if (!cur.topic && next.topic) lastRunDate = todayLocal();
  db.prepare(`
    UPDATE subbox_config
    SET topic = ?, schedule_time = ?, enabled = ?, last_run_date = ?, updated_at = datetime('now')
    WHERE id = 1
  `).run(next.topic, next.schedule_time, next.enabled, lastRunDate);
  return getConfig();
};

const claimRun = (today) => {
  const info = db.prepare(`
    UPDATE subbox_config
    SET last_run_date = ?, last_run_at = ?, last_status = 'running', last_error = '', updated_at = datetime('now')
    WHERE id = 1 AND last_run_date <> ?
  `).run(today, nowIso(), today);
  return info.changes > 0;
};

const finishRun = ({ ok, error = "" }) => {
  db.prepare(`
    UPDATE subbox_config
    SET last_run_at = ?, last_status = ?, last_error = ?, updated_at = datetime('now')
    WHERE id = 1
  `).run(nowIso(), ok ? "ok" : "error", error);
};

const resetLastRunDate = () => {
  db.prepare(`UPDATE subbox_config SET last_run_date = '' WHERE id = 1`).run();
};

export { getConfig, saveConfig, claimRun, finishRun, resetLastRunDate };
