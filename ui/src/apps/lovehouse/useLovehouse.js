// 虚拟伴侣聊天: state + API
import { ref } from "vue";

const API_BASE = "/apps/lovehouse";

const api = async (path, init) => {
    const res = await fetch(`${API_BASE}${path}`, init);
    return res.json();
};

export function useLovehouse() {
    const character = ref(null);
    const characterReady = ref(false);
    const messages = ref([]);
    const sending = ref(false);

    const loadCharacter = async () => {
        try {
            const data = await api("/character");
            character.value = data.character || null;
        } catch {
            character.value = null;
        } finally {
            characterReady.value = true;
        }
    };

    const saveCharacter = async (form) => {
        const data = await api("/character", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form)
        });
        if (data?.success) {
            character.value = data.character;
            return { success: true };
        }
        return { success: false, message: data?.message || "保存失败" };
    };

    const loadMessages = async () => {
        try {
            const data = await api("/messages?limit=200");
            messages.value = data.items || [];
        } catch {}
    };

    const sendMessage = async (text) => {
        const content = String(text || "").trim();
        if (!content || sending.value) return;
        // 乐观加入用户消息
        messages.value.push({
            id: `local:${Date.now()}`,
            role: "user",
            content
        });
        sending.value = true;
        try {
            const data = await api("/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content })
            });
            if (!data.success) {
                messages.value.push({
                    id: `err:${Date.now()}`,
                    role: "assistant",
                    content: data.message || "嗯…出了点小问题",
                    thought: "",
                    mood: ""
                });
                return;
            }
            messages.value.push({
                id: `ai:${Date.now()}`,
                role: "assistant",
                content: data.reply,
                thought: data.thought || "",
                mood: data.mood || ""
            });
        } catch {
            messages.value.push({
                id: `err:${Date.now()}`,
                role: "assistant",
                content: "网络好像有点问题…",
                thought: "",
                mood: ""
            });
        } finally {
            sending.value = false;
        }
    };

    return {
        character,
        characterReady,
        messages,
        sending,
        loadCharacter,
        saveCharacter,
        loadMessages,
        sendMessage
    };
}
