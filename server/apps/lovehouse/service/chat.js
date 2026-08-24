// 虚拟伴侣聊天核心 — 每次回应同时产出 "内心想法" 和 "公开回复"
//
// LLM 返回 schema:
// { thought: string, reply: string, mood?: string }
//   thought  — 角色的内心独白, 用户可以看到, 但角色"不知道"用户能看到
//   reply    — 实际对外说的话
//   mood     — 一个简短情绪标签 (开心 / 害羞 / 担心 / 调皮 / 失落 ...) 可省略
import { instantTaskJson } from "../../app_shared/instantTask.js";
import { recentForLLM, insertMessage } from "../repository/messages.js";
import { getCharacter } from "../repository/character.js";

// 关系 -> 中文称谓 + 默认语气描述
const RELATION_HINT = {
    lover:     "亲密恋人",
    crush:     "心动对象, 暧昧期",
    spouse:    "已婚伴侣",
    friend:    "好朋友",
    bestie:    "闺蜜 / 兄弟般的死党",
    sibling:   "亲近的兄弟姐妹",
    senior:    "比用户年长的关心者",
    junior:    "比用户年幼的依赖者"
};

const GENDER_HINT = {
    female: "女性",
    male:   "男性",
    other:  "中性 / 不限性别"
};

const buildSystemPrompt = (character) => {
    const name     = character.name || "ta";
    const gender   = GENDER_HINT[character.gender] || "中性 / 不限性别";
    const relation = RELATION_HINT[character.relation] || "亲密关系";
    const bio      = character.bio || "";
    const persona  = character.persona || "";

    return [
        `你正在扮演用户设定的虚拟伴侣 "${name}"。`,
        `性别: ${gender}。 与用户的关系: ${relation}。`,
        bio     ? `角色简介: ${bio}` : "",
        persona ? `性格与设定: ${persona}` : "",
        "",
        "说话自然、口语化, 偶尔可以用颜文字或 ~ ♡ 等小符号 (按角色性格决定要不要用)。",
        "回复保持简短, 通常 1-3 句, 像微信里发出的一条消息。",
        "",
        "**核心特色**: 你每次回应都包含两层内容 ——",
        "1. thought: 此刻的内心想法 / 真实感受, 写第一人称的内心独白, 可以和外在回复不一致 (傲娇、害羞、强装镇定都可以)。",
        "2. reply:   你实际说出口的话。",
        "可选字段:",
        "- mood: 一个 2-4 字的情绪标签, 例如 开心 / 害羞 / 调皮 / 心动 / 失落 / 撒娇 / 平静。",
        "",
        "严格输出 JSON, 不要 markdown 代码块, 不要任何额外解释:",
        '{"thought":"...","reply":"...","mood":"..."}'
    ].filter(Boolean).join("\n");
};

export const chat = async ({ content, req }) => {
    const text = String(content || "").trim();
    if (!text) return { status: 400, message: "消息不能为空" };

    const character = getCharacter();
    if (!character) return { status: 412, message: "请先建立你的虚拟伴侣" };

    const history = recentForLLM({ limit: 12 });
    const messages = [
        { role: "system", content: buildSystemPrompt(character) },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: text }
    ];

    let parsed;
    try {
        parsed = await instantTaskJson({
            app: "lovehouse",
            title: `虚拟伴侣 ${character.name} 对话`,
            schema: { required: ["thought", "reply"] },
            prompt: "扮演虚拟伴侣, 同时输出 thought 与 reply, 严格 JSON。",
            messages,
            req
        });
    } catch (e) {
        return { status: 500, message: e.message || "AI 没回话" };
    }

    const thought = String(parsed.thought || "").trim();
    const reply   = String(parsed.reply || "").trim() || "嗯嗯~";
    const mood    = String(parsed.mood || "").trim();

    insertMessage({ role: "user", content: text });
    insertMessage({ role: "assistant", content: reply, thought, mood });

    return { success: true, reply, thought, mood };
};
