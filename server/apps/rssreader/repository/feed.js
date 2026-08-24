import { db } from "./client.js";

const listFeeds = () => db.prepare("SELECT * FROM rss_feeds ORDER BY created_at DESC").all();

const addFeed = ({ name, url }) => {
  const existing = db.prepare("SELECT id FROM rss_feeds WHERE url = ?").get(url);
  if (existing) return existing;
  const ret = db.prepare("INSERT INTO rss_feeds (name, url) VALUES (?, ?)").run(name, url);
  return db.prepare("SELECT * FROM rss_feeds WHERE id = ?").get(ret.lastInsertRowid);
};

const removeFeed = (id) => db.prepare("DELETE FROM rss_feeds WHERE id = ?").run(id);

const addBookmark = ({ feedId, title, url, summary }) => {
  const existing = db.prepare("SELECT id FROM rss_bookmarks WHERE url = ?").get(url);
  if (existing) return existing;
  const ret = db.prepare("INSERT INTO rss_bookmarks (feed_id, title, url, summary) VALUES (?, ?, ?, ?)").run(feedId || null, title, url, summary || '');
  return db.prepare("SELECT * FROM rss_bookmarks WHERE id = ?").get(ret.lastInsertRowid);
};

const removeBookmark = (id) => db.prepare("DELETE FROM rss_bookmarks WHERE id = ?").run(id);

const listBookmarks = () => db.prepare("SELECT * FROM rss_bookmarks ORDER BY created_at DESC").all();

export { listFeeds, addFeed, removeFeed, addBookmark, removeBookmark, listBookmarks };
