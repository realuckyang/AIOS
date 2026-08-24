// 「记忆」是 contexts 表 (source = 'memory') 的用户视角.
// 公共 API 暴露 enabled / pinned 两个语义字段, 内部映射到 access 列.
import { randomUUID } from "crypto";
import { db } from "./client.js";

const SOURCE = "memory";
const ENABLED_ACCESS = "full";   // enabled = true → access = 'full' (主 prompt 拼接全文)
const DISABLED_ACCESS = "none";  // enabled = false → access = 'none' (不参与 prompt)

const rowToMemory = (row) => row && {
    id: row.id,
    title: row.title || "",
    description: row.summary || "",
    content: row.content || "",
    enabled: row.access !== "none",
    pinned: !!row.pinned,
    created_at: row.created_at || row.updated_at || null,
    updated_at: row.updated_at || null
};

const listMemories = () => {
    const rows = db.prepare(`
        SELECT id, title, summary, content, access, pinned, created_at, updated_at
        FROM contexts
        WHERE source = ?
        ORDER BY pinned DESC, id DESC
    `).all(SOURCE);
    return rows.map(rowToMemory);
};

const getMemory = (id) => {
    const row = db.prepare(
        "SELECT id, title, summary, content, access, pinned, created_at, updated_at FROM contexts WHERE id = ? AND source = ?"
    ).get(Number(id) || 0, SOURCE);
    return rowToMemory(row);
};

const createMemory = ({ title, description = "", content, enabled = true, pinned = false }) => {
    const access = enabled ? ENABLED_ACCESS : DISABLED_ACCESS;
    const ret = db.prepare(`
        INSERT INTO contexts (source, source_id, title, summary, content, access, pinned)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        SOURCE,
        randomUUID(),
        String(title || "").trim(),
        String(description || "").trim(),
        String(content || "").trim(),
        access,
        pinned ? 1 : 0
    );
    return getMemory(ret.lastInsertRowid);
};

const updateMemory = (id, patch = {}) => {
    const fields = [];
    const values = [];
    if (patch.title !== undefined) { fields.push("title = ?"); values.push(String(patch.title).trim()); }
    if (patch.description !== undefined) { fields.push("summary = ?"); values.push(String(patch.description).trim()); }
    if (patch.content !== undefined) { fields.push("content = ?"); values.push(String(patch.content).trim()); }
    if (patch.pinned !== undefined) { fields.push("pinned = ?"); values.push(patch.pinned ? 1 : 0); }
    if (patch.enabled !== undefined) { fields.push("access = ?"); values.push(patch.enabled ? ENABLED_ACCESS : DISABLED_ACCESS); }
    if (!fields.length) return getMemory(id);
    fields.push("updated_at = datetime('now')");
    values.push(Number(id) || 0, SOURCE);
    db.prepare(`UPDATE contexts SET ${fields.join(", ")} WHERE id = ? AND source = ?`).run(...values);
    return getMemory(id);
};

const deleteMemory = (id) => {
    db.prepare("DELETE FROM contexts WHERE id = ? AND source = ?").run(Number(id) || 0, SOURCE);
    return { success: true };
};

export { listMemories, getMemory, createMemory, updateMemory, deleteMemory };
