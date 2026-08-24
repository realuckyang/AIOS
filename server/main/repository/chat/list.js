import { db } from "../client.js";
const listChatRows = (scene = null) => {
  if (scene) {
    return db.prepare(`
      SELECT id, conversation_id, title, description, scene, meta, state, pinned, created_at
      FROM chats
      WHERE scene = ?
      ORDER BY pinned DESC, created_at DESC
    `).all(scene);
  }
  return db.prepare(`
    SELECT id, conversation_id, title, description, scene, meta, state, pinned, created_at
    FROM chats
    ORDER BY pinned DESC, created_at DESC
  `).all();
};
export {
  listChatRows
};
