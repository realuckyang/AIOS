import { db } from "./client.js";
const initFortuneDatabase = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS fortune_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL DEFAULT '',
      sign_name TEXT NOT NULL DEFAULT '',
      sign_poem TEXT NOT NULL DEFAULT '',
      good TEXT NOT NULL DEFAULT '',
      bad TEXT NOT NULL DEFAULT '',
      advice TEXT NOT NULL DEFAULT '',
      hexagram TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
};
export {
  initFortuneDatabase
};
