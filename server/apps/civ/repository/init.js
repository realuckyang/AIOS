import { db } from "./client.js";

const initCivDatabase = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS civ_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report TEXT NOT NULL DEFAULT '',
      task_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
};

export { initCivDatabase };
