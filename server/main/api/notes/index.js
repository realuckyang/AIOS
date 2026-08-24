// 笔记 API —— 极简: list / save / pin / delete
//
// Routes:
//   GET  /api/notes/list
//   POST /api/notes/save    { id?, title, body, pinned }
//   POST /api/notes/pin     { id, pinned }
//   POST /api/notes/delete  { id }    // 直接硬删
import { db } from "../../repository/client.js";
import { readBody } from "../../../shared/http/readBody.js";
import { json } from "../../../shared/http/json.js";

const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const SELECT = `id, title, body, pinned, created_at, updated_at`;
const getNote = (id) => db.prepare(`SELECT ${SELECT} FROM notes WHERE id = ?`).get(id);

const listNotes = () =>
  db.prepare(
    `SELECT ${SELECT} FROM notes ORDER BY pinned DESC, updated_at DESC, id DESC`
  ).all();

const saveNote = (input) => {
  const title  = String(input.title || "").slice(0, 200);
  const body   = String(input.body || "");
  const pinned = input.pinned ? 1 : 0;
  const ts = now();
  if (input.id) {
    db.prepare(
      `UPDATE notes SET title=?, body=?, pinned=?, updated_at=? WHERE id=?`
    ).run(title, body, pinned, ts, input.id);
    return getNote(input.id);
  }
  if (!title.trim() && !body.trim()) throw new Error("note is empty");
  const info = db.prepare(
    `INSERT INTO notes (title, body, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
  ).run(title, body, pinned, ts, ts);
  return getNote(info.lastInsertRowid);
};

const setPinned = (id, pinned) => {
  db.prepare(`UPDATE notes SET pinned=?, updated_at=? WHERE id=?`).run(pinned ? 1 : 0, now(), id);
  return getNote(id);
};

const deleteNote = (id) => {
  db.prepare(`DELETE FROM notes WHERE id=?`).run(id);
  return { ok: true };
};

const handleNotesApi = async (req, res, path) => {
  if (path === "/api/notes/list" && req.method === "GET") {
    return json(res, { items: listNotes() });
  }
  if (path === "/api/notes/save" && req.method === "POST") {
    const body = await readBody(req);
    try { return json(res, { item: saveNote(body) }); }
    catch (e) { return json(res, { error: e.message }, 400); }
  }
  if (path === "/api/notes/pin" && req.method === "POST") {
    const body = await readBody(req);
    if (!body.id) return json(res, { error: "Missing id" }, 400);
    return json(res, { item: setPinned(body.id, body.pinned) });
  }
  if (path === "/api/notes/delete" && req.method === "POST") {
    const body = await readBody(req);
    if (!body.id) return json(res, { error: "Missing id" }, 400);
    return json(res, deleteNote(body.id));
  }
  return json(res, { error: "API endpoint not found" }, 404);
};

export { handleNotesApi };
