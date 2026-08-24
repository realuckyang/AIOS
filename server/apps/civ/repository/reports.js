import { db } from "./client.js";

const insertReport = ({ report, taskId }) => {
  const stmt = db.prepare("INSERT INTO civ_reports (report, task_id) VALUES (?, ?)");
  const info = stmt.run(report, taskId || null);
  return info.lastInsertRowid;
};

const getLatestReport = () => {
  return db.prepare("SELECT id, report, task_id, created_at FROM civ_reports ORDER BY id DESC LIMIT 1").get() || null;
};

const listReports = (limit = 30) => {
  return db.prepare("SELECT id, task_id, created_at FROM civ_reports ORDER BY id DESC LIMIT ?").all(limit);
};

const getReportById = (id) => {
  return db.prepare("SELECT id, report, task_id, created_at FROM civ_reports WHERE id = ?").get(id) || null;
};

export { insertReport, getLatestReport, listReports, getReportById };
