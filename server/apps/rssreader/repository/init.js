import { readFileSync } from "fs";
import { resolve } from "path";
import { db } from "./client.js";
import { getSystemLanguage } from "../../app_shared/settings/language.js";

// 默认订阅源放在 language/<locale>/apps/rssreader/seeds.json,
// 跟 APP.md 同目录,bake 不动这种非字符串 JSON.
const loadSeeds = () => {
  const lang = getSystemLanguage();
  const tryRead = (locale) => {
    try {
      const file = resolve(process.cwd(), `language/${locale}/apps/rssreader/seeds.json`);
      const data = JSON.parse(readFileSync(file, "utf-8"));
      return Array.isArray(data?.feeds) ? data.feeds : [];
    } catch { return null; }
  };
  return tryRead(lang) || tryRead("zh") || tryRead("en") || [];
};

const initRssreaderDatabase = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rss_feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS rss_bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feed_id INTEGER,
      title TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 表为空才种入种子,不影响用户已加的源
  const count = db.prepare("SELECT COUNT(*) as c FROM rss_feeds").get().c;
  if (count === 0) {
    const seeds = loadSeeds();
    const insert = db.prepare("INSERT OR IGNORE INTO rss_feeds (name, url) VALUES (?, ?)");
    for (const s of seeds) {
      if (s?.name && s?.url) insert.run(String(s.name), String(s.url));
    }
  }
};

export { initRssreaderDatabase };
