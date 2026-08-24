/**
 * Codex Responses API adapter
 *
 * Translates Chat Completions format ↔ Codex Responses API format.
 * Used when authMethod is "oauth" (token from OpenAI ChatGPT login).
 *
 * Codex endpoint: https://chatgpt.com/backend-api/codex/responses
 * Required headers: Authorization, chatgpt-account-id, OpenAI-Beta
 */

import { parseJson } from "../../shared/json/parse.js";

const CODEX_API_URL = "https://chatgpt.com/backend-api/codex/responses";

/**
 * Convert Chat Completions messages → Codex Responses API input format.
 *
 * Chat Completions:  [{ role, content }]
 * Responses API:     instructions (system) + input [{ type:"message", role, content:[{type, text}] }]
 */
const convertMessages = (messages) => {
  let instructions = "";
  const input = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      // System messages become the "instructions" field
      instructions += (instructions ? "\n" : "") + (typeof msg.content === "string" ? msg.content : "");
      continue;
    }

    if (msg.role === "user") {
      const text = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
      input.push({
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }]
      });
      continue;
    }

    if (msg.role === "assistant") {
      const parts = [];
      if (msg.content) {
        parts.push({ type: "output_text", text: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content) });
      }
      // Convert tool_calls if present
      if (Array.isArray(msg.tool_calls)) {
        for (const tc of msg.tool_calls) {
          parts.push({
            type: "function_call",
            id: tc.id || "",
            name: tc.function?.name || "",
            arguments: tc.function?.arguments || "{}"
          });
        }
      }
      if (parts.length > 0) {
        input.push({ type: "message", role: "assistant", content: parts });
      }
      continue;
    }

    if (msg.role === "tool") {
      input.push({
        type: "function_call_output",
        call_id: msg.tool_call_id || "",
        output: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)
      });
      continue;
    }
  }

  return { instructions, input };
};

/**
 * Convert Chat Completions tools → Responses API tools format.
 */
const convertTools = (tools) => {
  if (!Array.isArray(tools) || tools.length === 0) return undefined;
  return tools.map((t) => ({
    type: "function",
    name: t.function?.name || "",
    description: t.function?.description || "",
    parameters: t.function?.parameters || {}
  }));
};

/**
 * Build the Codex Responses API request body from a Chat Completions payload.
 */
const buildCodexPayload = (payload) => {
  const { instructions, input } = convertMessages(payload.messages || []);
  const body = {
    model: payload.model || "gpt-4.1-mini",
    instructions: instructions || "You are a helpful assistant.",
    input,
    store: false,
    stream: true
  };

  const tools = convertTools(payload.tools);
  if (tools) body.tools = tools;

  if (payload.temperature !== undefined) body.temperature = payload.temperature;
  if (payload.top_p !== undefined) body.top_p = payload.top_p;

  return body;
};

/**
 * Build headers for the Codex Responses API.
 */
const buildCodexHeaders = (accessToken, accountId) => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${accessToken}`,
  "chatgpt-account-id": accountId || "",
  "OpenAI-Beta": "responses=experimental"
});

/**
 * Parse Codex SSE stream and extract content + tool_calls in Chat Completions format.
 *
 * Codex streams events like:
 *   response.output_text.delta  → { delta: "text" }
 *   response.function_call_arguments.delta → { delta: "args" }
 *   response.completed → final response
 */
const callCodexStream = async (accessToken, accountId, payload, { signal, onDelta } = {}) => {
  const codexPayload = buildCodexPayload(payload);

  const res = await fetch(CODEX_API_URL, {
    method: "POST",
    headers: buildCodexHeaders(accessToken, accountId),
    body: JSON.stringify(codexPayload),
    signal
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Codex ${res.status}: ${text}`);
  }

  if (!res.body) throw new Error("Codex stream body is empty");

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  const state = { content: "", toolCalls: [] };
  // Track current function call being built
  const fnCallMap = new Map();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let sep = buffer.indexOf("\n\n");
    while (sep >= 0) {
      const event = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      sep = buffer.indexOf("\n\n");

      // Parse SSE lines
      let eventType = "";
      let eventData = "";
      for (const line of event.split("\n")) {
        if (line.startsWith("event:")) eventType = line.slice(6).trim();
        else if (line.startsWith("data:")) eventData = line.slice(5).trim();
      }

      if (!eventData || eventData === "[DONE]") continue;

      const json = parseJson(eventData, "codex.stream");
      if (!json) continue;

      // Handle different event types
      if (eventType === "response.output_text.delta") {
        const text = json.delta || "";
        if (text) {
          state.content += text;
          onDelta?.(text);
        }
      } else if (eventType === "response.function_call_arguments.delta") {
        // Build up function call arguments
        const itemId = json.item_id || "";
        if (!fnCallMap.has(itemId)) {
          fnCallMap.set(itemId, { id: "", name: "", arguments: "" });
        }
        fnCallMap.get(itemId).arguments += json.delta || "";
      } else if (eventType === "response.output_item.added") {
        // New output item (could be text or function_call)
        const item = json.item || {};
        if (item.type === "function_call") {
          fnCallMap.set(item.id || "", {
            id: item.call_id || item.id || "",
            name: item.name || "",
            arguments: ""
          });
        }
      } else if (eventType === "response.output_item.done") {
        // Output item completed
        const item = json.item || {};
        if (item.type === "function_call") {
          const fc = fnCallMap.get(item.id || "") || {};
          state.toolCalls.push({
            id: item.call_id || fc.id || item.id || "",
            type: "function",
            function: {
              name: item.name || fc.name || "",
              arguments: item.arguments || fc.arguments || "{}"
            }
          });
        }
      }
      // Ignore other event types (response.created, response.completed, etc.)
    }
  }

  if (state.toolCalls.length > 0) {
    return {
      role: "assistant",
      content: state.content || null,
      tool_calls: state.toolCalls
    };
  }
  return { role: "assistant", content: state.content };
};

export { callCodexStream, CODEX_API_URL };
