import { readBody } from "../../../shared/http/readBody.js";
import { json } from "../../../shared/http/json.js";
import { listMessages } from "../repository/messages.js";
import { getCharacter, upsertCharacter } from "../repository/character.js";
import { chat } from "../service/chat.js";

const reply = (res, data) => {
    if (data?.status) return json(res, { success: false, message: data.message }, data.status);
    return json(res, data);
};

export const handleLovehouseApi = async (req, res, path) => {
    // ── 角色 ───────────────────────────────────
    if (req.method === "GET" && path === "/apps/lovehouse/character") {
        return json(res, { character: getCharacter() });
    }

    if (req.method === "POST" && path === "/apps/lovehouse/character") {
        const body = await readBody(req);
        const name = String(body?.name || "").trim();
        if (!name) {
            return json(res, { success: false, message: "名字不能为空" }, 400);
        }
        const character = upsertCharacter({
            gender:       String(body?.gender || "female").trim(),
            relation:     String(body?.relation || "lover").trim(),
            name,
            avatar_emoji: String(body?.avatar_emoji || "🌸").trim(),
            bio:          String(body?.bio || "").trim(),
            persona:      String(body?.persona || "").trim()
        });
        return json(res, { success: true, character });
    }

    // ── 消息 ───────────────────────────────────
    if (req.method === "GET" && path === "/apps/lovehouse/messages") {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const limit = Number(url.searchParams.get("limit") || 100);
        return json(res, { items: listMessages({ limit }) });
    }

    if (req.method === "POST" && path === "/apps/lovehouse/chat") {
        const body = await readBody(req);
        return reply(res, await chat({ ...body, req }));
    }

    return false;
};
