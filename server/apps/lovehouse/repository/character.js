import { db } from "./client.js";

// 单行表 (id=1), 没有则返回 null
export const getCharacter = () => {
    return db.prepare(`
        SELECT id, gender, relation, name, avatar_emoji, bio, persona, created_at, updated_at
        FROM apps_lovehouse_character
        WHERE id = 1
    `).get() || null;
};

export const upsertCharacter = ({
    gender = "female",
    relation = "lover",
    name = "",
    avatar_emoji = "🌸",
    bio = "",
    persona = ""
}) => {
    db.prepare(`
        INSERT INTO apps_lovehouse_character (id, gender, relation, name, avatar_emoji, bio, persona, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            gender       = excluded.gender,
            relation     = excluded.relation,
            name         = excluded.name,
            avatar_emoji = excluded.avatar_emoji,
            bio          = excluded.bio,
            persona      = excluded.persona,
            updated_at   = datetime('now')
    `).run(gender, relation, name, avatar_emoji, bio, persona);
    return getCharacter();
};
