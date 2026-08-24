import { db } from "./client.js";
const initPokerDatabase = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS poker_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_cards TEXT NOT NULL DEFAULT '[]',
      ai_cards TEXT NOT NULL DEFAULT '[]',
      action_history TEXT NOT NULL DEFAULT '[]',
      player_chips INTEGER NOT NULL DEFAULT 5000,
      ai_chips INTEGER NOT NULL DEFAULT 5000,
      pot INTEGER NOT NULL DEFAULT 0,
      round INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'playing',
      winner TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS poker_accounts (
      role TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.prepare(`
    INSERT OR IGNORE INTO poker_accounts (role, balance)
    VALUES ('player', 5000)
  `).run();
  db.prepare(`
    INSERT OR IGNORE INTO poker_accounts (role, balance)
    VALUES ('ai', 5000)
  `).run();
};
export {
  initPokerDatabase
};
