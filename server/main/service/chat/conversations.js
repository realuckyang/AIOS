import { randomUUID } from "crypto";
import { db } from "../../repository/client.js";
const createChat = (title = "新对话", scene = "chat", meta = null) => {
  const conversationId = randomUUID();
  db.prepare("INSERT INTO chats (conversation_id, title, scene, meta) VALUES (?, ?, ?, ?)").run(conversationId, title, scene, meta ? JSON.stringify(meta) : null);
  return { conversationId };
};
const hasChat = (conversationId) => {
  const id = String(conversationId || "").trim();
  if (!id) return false;
  return !!db.prepare("SELECT 1 FROM chats WHERE conversation_id = ? LIMIT 1").get(id);
};
const setChatState = (conversationId, state = "idle") => {
  const id = String(conversationId || "").trim();
  const next = state === "running" ? "running" : "idle";
  if (!id) return { success: false };
  db.prepare("UPDATE chats SET state = ? WHERE conversation_id = ?").run(next, id);
  return { success: true, state: next };
};
const setChatPinned = (conversationId, pinned) => {
  const id = String(conversationId || "").trim();
  const next = pinned ? 1 : 0;
  if (!id) return { success: false };
  db.prepare("UPDATE chats SET pinned = ? WHERE conversation_id = ?").run(next, id);
  return { success: true, pinned: Boolean(next) };
};
export {
  createChat,
  hasChat,
  setChatPinned,
  setChatState
};
