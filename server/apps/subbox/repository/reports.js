import { db } from "./client.js";

const insertReport = ({ summary, taskId, ok, error = "" }) => {
  db.prepare(`
    INSERT INTO subbox_reports (summary, task_id, ok, error)
    VALUES (?, ?, ?, ?)
  `).run(
    String(summary || ""),
    Number(taskId || 0),
    ok ? 1 : 0,
    String(error || "")
  );
};

const listReports = ({ limit = 50 } = {}) => {
  const lim = Math.max(1, Math.min(500, Number(limit) || 50));
  return db.prepare(`SELECT * FROM subbox_reports ORDER BY id DESC LIMIT ?`).all(lim);
};

const clearReports = () => {
  db.prepare(`DELETE FROM subbox_reports`).run();
};

export { insertReport, listReports, clearReports };
