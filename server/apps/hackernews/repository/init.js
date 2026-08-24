import { db } from "./client.js";
const initHackernewsDatabase = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS hackernews_bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hn_id INTEGER NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      by TEXT NOT NULL DEFAULT '',
      score INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
};
export { initHackernewsDatabase };
