import { buildLlmHeaders, resolveOAuth } from "./common.js";
import { callCodexStream } from "./codex.js";

const callLlmRegular = async (provider, apiUrl, apiKey, payload, signal) => {
  // Check if we should use the Codex OAuth path
  // Codex only supports streaming, so we use stream and collect the result
  const oauth = await resolveOAuth();
  if (oauth.useCodex && provider === "openai") {
    return callCodexStream(oauth.accessToken, oauth.accountId, payload, { signal });
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: buildLlmHeaders(provider, apiUrl, apiKey),
      body: JSON.stringify(payload),
      signal
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LLM ${res.status}: ${text}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message || { role: "assistant", content: "" };
  } catch (error) {
    throw error;
  }
};

export { callLlmRegular };
