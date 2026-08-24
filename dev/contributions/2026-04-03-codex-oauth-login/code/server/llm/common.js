import { getSettings } from "../service/settings/get.js";
import { refreshOAuthToken } from "../api/auth/openai-oauth.js";

/**
 * Check if the current request should use the Codex OAuth path.
 * Returns { useCodex, accessToken, accountId } or { useCodex: false }.
 */
const resolveOAuth = async () => {
  const settings = getSettings();
  if (settings.authMethod !== "oauth") return { useCodex: false };

  const { oauthRefreshToken, oauthAccessToken, oauthTokenExpiresAt, oauthAccountId } = settings;
  if (!oauthAccessToken) return { useCodex: false };

  // Check if token is expiring within 5 minutes
  const expiresAt = Number(oauthTokenExpiresAt) || 0;
  if (expiresAt > Date.now() + 5 * 60 * 1000) {
    return { useCodex: true, accessToken: oauthAccessToken, accountId: oauthAccountId || "" };
  }

  // Token expired or about to expire — try refresh but don't break if it fails
  if (oauthRefreshToken) {
    try {
      const result = await refreshOAuthToken(oauthRefreshToken);
      if (result.accessToken) {
        const refreshedSettings = getSettings();
        return {
          useCodex: true,
          accessToken: result.accessToken,
          accountId: refreshedSettings.oauthAccountId || oauthAccountId || ""
        };
      }
    } catch {
      // refresh failed — fall through to use existing token
    }
  }
  return { useCodex: true, accessToken: oauthAccessToken, accountId: oauthAccountId || "" };
};

const buildLlmHeaders = (provider, apiUrl, apiKey) => {
  const headers = { "Content-Type": "application/json" };
  if (provider === "claude") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  if (apiUrl.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = "http://localhost:3000";
    headers["X-Title"] = "aios";
  }
  return headers;
};

export {
  buildLlmHeaders,
  resolveOAuth
};
