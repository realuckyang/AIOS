import { instantTaskJson } from "../../app_shared/instantTask.js";
import { insertRecord } from "../repository/divine.js";
const divine = async ({ question, hexagram, prompt, messages, taskTitle, req }) => {
  const promptText = String(prompt || "").trim();
  if (!promptText) return { status: 400, message: "prompt is required" };
  const taskMessages = Array.isArray(messages) ? messages : [];
  if (taskMessages.length === 0) return { status: 400, message: "messages are required" };
  const parsed = await instantTaskJson({
    app: "fortune",
    title: String(taskTitle || "").trim() || "周易解卦",
    schema: { required: ["signName", "signPoem", "good", "bad", "advice"] },
    prompt: promptText,
    messages: taskMessages,
    req
  });
  const record = {
    question,
    signName: String(parsed.signName || "").trim() || "未知",
    signPoem: String(parsed.signPoem || "").trim() || "",
    good: String(parsed.good || "").trim() || "",
    bad: String(parsed.bad || "").trim() || "",
    advice: String(parsed.advice || "").trim() || "",
    hexagram
  };
  const item = insertRecord(record);
  return { success: true, item };
};
export {
  divine
};
