import { db } from "./client.js";

const addBookmark = ({ hnId, title, url, by, score }) => {
  const existing = db.prepare("SELECT id FROM hackernews_bookmarks WHERE hn_id = ?").get(hnId);
  if (existing) return existing;
  const ret = db.prepare(
    "INSERT INTO hackernews_bookmarks (hn_id, title, url, by, score) VALUES (?, ?, ?, ?, ?)"
  ).run(hnId, title || '', url || '', by || '', score || 0);
  return db.prepare("SELECT * FROM hackernews_bookmarks WHERE id = ?").get(ret.lastInsertRowid);
};

const removeBookmark = (hnId) => {
  db.prepare("DELETE FROM hackernews_bookmarks WHERE hn_id = ?").run(hnId);
};

const listBookmarks = () => {
  return db.prepare("SELECT * FROM hackernews_bookmarks ORDER BY created_at DESC").all();
};

const isBookmarked = (hnId) => {
  return !!db.prepare("SELECT id FROM hackernews_bookmarks WHERE hn_id = ?").get(hnId);
};

export { addBookmark, removeBookmark, listBookmarks, isBookmarked };
