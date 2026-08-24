import { db } from "./client.js";

const normalizeAccess = (access) => {
  const value = String(access || "none").trim();
  return value === "summary" || value === "full" ? value : "none";
};

const upsertContext = ({ source, sourceId, title = "", summary = "", content = "", access = "none" }) => {
  const nextAccess = normalizeAccess(access);
  db.prepare(`
    INSERT INTO contexts (source, source_id, title, summary, content, access, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(source, source_id) DO UPDATE SET
      title = excluded.title,
      summary = excluded.summary,
      content = excluded.content,
      access = excluded.access,
      updated_at = datetime('now')
  `).run(
    String(source || ""),
    String(sourceId || ""),
    String(title || ""),
    String(summary || ""),
    String(content || ""),
    nextAccess
  );
  return { success: true };
};

const deleteContext = ({ source, sourceId }) => {
  db.prepare("DELETE FROM contexts WHERE source = ? AND source_id = ?")
    .run(String(source || ""), String(sourceId || ""));
  return { success: true };
};

const listContexts = ({ includeNone = true, limit = 200 } = {}) => {
  const max = Math.max(1, Math.min(500, Number(limit) || 200));
  const sql = includeNone
    ? `SELECT id, source, source_id, title, summary, content, access, updated_at
       FROM contexts
       ORDER BY datetime(updated_at) DESC, id DESC
       LIMIT ?`
    : `SELECT id, source, source_id, title, summary, content, access, updated_at
       FROM contexts
       WHERE access IN ('summary', 'full')
       ORDER BY datetime(updated_at) DESC, id DESC
       LIMIT ?`;
  return db.prepare(sql).all(max);
};

export {
  deleteContext,
  listContexts,
  normalizeAccess,
  upsertContext
};
