import { instantTaskJson } from "../../app_shared/instantTask.js";
import { insertSession } from "../repository/generation.js";
const generate = async ({ history, now, choices, next, prompt, messages, taskTitle, req }) => {
  const promptText = String(prompt || "").trim();
  if (!promptText) return { status: 400, message: "prompt is required" };
  const taskMessages = Array.isArray(messages) ? messages : [];
  if (taskMessages.length === 0) return { status: 400, message: "messages are required" };
  const parsed = await instantTaskJson({
    app: "banana",
    title: String(taskTitle || "").trim() || "老手机界面生成",
    schema: { required: ["content", "options"] },
    prompt: promptText,
    messages: taskMessages,
    req
  });
  // 净化 options: 去空 text、去重、最多 3 个
  const seen = new Set();
  const cleanOptions = (Array.isArray(parsed.options) ? parsed.options : [])
    .map((o) => String(o?.text || "").trim())
    .filter((t) => {
      if (!t) return false;
      const k = t.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 3)
    .map((text) => ({ text }));

  if (cleanOptions.length === 0) {
    return { status: 502, message: "AI 没给出可用选项,请重试" };
  }

  const result = {
    content: String(parsed.content || ""),
    options: cleanOptions
  };
  try {
    insertSession({
      currentScreen: result,
      screenHistory: { history, now, choices, next }
    });
  } catch (e) {
    console.error("Failed to save Banana progress:", e.message);
  }
  return result;
};
export {
  generate
};
