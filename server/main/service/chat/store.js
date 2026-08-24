import { db } from "../../repository/client.js";
import { normalizeContextRounds } from "../settings/get.js";
import { redactDeep } from "../runtime/redact.js";

const getMessages = (conversationId, messageLimit = 100) => {
  const limit = normalizeContextRounds(messageLimit);
  const rows = db.prepare("SELECT id, message, meta FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?").all(conversationId, limit);
  return rows.reverse().map((r) => ({
    ...JSON.parse(r.message),
    _id: r.id,
    _meta: r.meta ? JSON.parse(r.meta) : null
  }));
};
const saveMessage = (conversationId, msg, meta = null, remark = null) => {
  // 写库前过 redact —— AI 工具结果若回显了 AIOS_API_TOKEN 真值,
  // 在持久化之前替换为字面量 $AIOS_API_TOKEN,避免长存于数据库.
  const safeMsg  = redactDeep(msg);
  const safeMeta = meta ? redactDeep(meta) : null;
  const result = db.prepare("INSERT INTO messages (conversation_id, message, meta, remark) VALUES (?, ?, ?, ?)").run(
    conversationId,
    JSON.stringify(safeMsg),
    safeMeta ? JSON.stringify(safeMeta) : null,
    remark
  );
  return { id: Number(result.lastInsertRowid) };
};
export {
  getMessages,
  saveMessage
};
