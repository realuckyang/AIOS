// 虚拟伴侣聊天
//   - apps_lovehouse_character: 用户首次进入时建立的虚拟伴侣角色 (单行, id=1)
//   - apps_lovehouse_messages:  每条 AI 消息同时带「内心想法」和「公开回复」
import { db } from "./client.js";

export const initLovehouseDatabase = () => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS apps_lovehouse_character (
            id            INTEGER PRIMARY KEY CHECK (id = 1),
            gender        TEXT NOT NULL DEFAULT 'female',
            relation      TEXT NOT NULL DEFAULT 'lover',
            name          TEXT NOT NULL DEFAULT '',
            avatar_emoji  TEXT NOT NULL DEFAULT '🌸',
            bio           TEXT NOT NULL DEFAULT '',
            persona       TEXT NOT NULL DEFAULT '',
            created_at    TEXT DEFAULT (datetime('now')),
            updated_at    TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS apps_lovehouse_messages (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            role        TEXT NOT NULL,
            content     TEXT NOT NULL DEFAULT '',
            thought     TEXT NOT NULL DEFAULT '',
            mood        TEXT NOT NULL DEFAULT '',
            created_at  TEXT DEFAULT (datetime('now'))
        );
    `);
};
