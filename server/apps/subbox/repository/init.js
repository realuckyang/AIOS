import { db } from "./client.js";

const initDatabase = () => {
  db.exec(`CREATE TABLE IF NOT EXISTS subbox_config (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    topic TEXT NOT NULL DEFAULT '',
    schedule_time TEXT NOT NULL DEFAULT '08:00',
    enabled INTEGER NOT NULL DEFAULT 0,
    last_run_date TEXT NOT NULL DEFAULT '',
    last_run_at TEXT NOT NULL DEFAULT '',
    last_status TEXT NOT NULL DEFAULT '',
    last_error TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS subbox_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    summary TEXT NOT NULL DEFAULT '',
    task_id INTEGER NOT NULL DEFAULT 0,
    ok INTEGER NOT NULL DEFAULT 1,
    error TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_subbox_reports_created ON subbox_reports(created_at DESC)`);
};

export { initDatabase };
