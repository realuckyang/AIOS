import { getSettings } from "../settings/get.js";
import { apps as appsSection } from "./apps.js";
import { chats as chatsSection } from "./chats.js";
import { contexts as contextsSection } from "./contexts.js";
import { DEFAULT_SYSTEM_PROMPT } from "./default.js";
import { environment as environmentSection } from "./environment.js";
import { model as modelSection } from "./model.js";
import { remarks as remarksSection } from "./remarks.js";
import { tools as toolsSection } from "./tools.js";

const instruction = (settings) => String(settings.systemPrompt || "").trim() || DEFAULT_SYSTEM_PROMPT;

const buildSystemPrompt = (currentConversationId = "") => {
  const settings = getSettings();
  const {
    apiUrl,
    model,
    provider,
    enableToolResultTruncate,
    toolResultMaxChars,
    enableToolLoopLimit,
    toolMaxRounds
  } = settings;
  const cwd = process.cwd();
  let prompt = instruction(settings);
  prompt += environmentSection(cwd);
  prompt += modelSection({ provider, name: model, apiUrl });
  prompt += toolsSection({
    enableToolResultTruncate,
    toolResultMaxChars,
    enableToolLoopLimit,
    toolMaxRounds
  });
  prompt += appsSection();
  prompt += chatsSection(currentConversationId);
  prompt += remarksSection(currentConversationId);
  prompt += contextsSection();
  return prompt;
};
export {
  buildSystemPrompt
};
