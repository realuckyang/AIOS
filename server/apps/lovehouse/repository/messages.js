import { db } from "./client.js";

export const listMessages = ({ limit = 100 } = {}) => {
    const safe = Math.min(200, Math.max(1, Number(limit) || 100));
    return db.prepare(`
        SELECT id, role, content, thought, mood, created_at
        FROM apps_lovehouse_messages
        ORDER BY id ASC
        LIMIT ?
    `).all(safe);
};

export const recentForLLM = ({ limit = 10 } = {}) => {
    const rows = db.prepare(`
        SELECT role, content
        FROM apps_lovehouse_messages
        ORDER BY id DESC
        LIMIT ?
    `).all(Math.max(1, Number(limit) || 10));
    return rows.reverse();
};

export const insertMessage = ({ role, content, thought = "", mood = "" }) =>
    db.prepare(`
        INSERT INTO apps_lovehouse_messages (role, content, thought, mood)
        VALUES (?, ?, ?, ?)
    `).run(role, content, thought, mood);
