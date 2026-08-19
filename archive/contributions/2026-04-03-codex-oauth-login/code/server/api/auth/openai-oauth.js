import { randomBytes, createHash } from "crypto";
import { createServer } from "http";
import { json } from "../../../shared/http/json.js";
import { saveSetting } from "../../repository/settings/save.js";
import { getSettings } from "../../service/settings/get.js";

/**
 * OpenAI OAuth 2.0 Authorization Code + PKCE flow
 *
 * Uses the same OAuth configuration as Codex CLI:
 *   - client_id: app_EMoamEEZ73f0CkXaXp7hrann
 *   - redirect_uri: http://localhost:1455/auth/callback
 *   - A temporary HTTP server on port 1455 captures the callback
 *
 * References:
 *   - https://github.com/openai/codex (codex-rs/login/src/)
 *   - https://docs.openclaw.ai/concepts/oauth
 */

const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const AUTH_URL = "https://auth.openai.com/oauth/authorize";
const TOKEN_URL = "https://auth.openai.com/oauth/token";
const CALLBACK_PORT = 1455;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/auth/callback`;
const SCOPES = "openid profile email offline_access";

const base64url = (buffer) =>
  buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const generatePkce = () => {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
};

// In-memory state for one active OAuth flow at a time
let activeFlow = null;

const cleanupFlow = () => {
  if (activeFlow?.server) {
    try { activeFlow.server.close(); } catch {}
  }
  if (activeFlow?.timeout) {
    clearTimeout(activeFlow.timeout);
  }
  activeFlow = null;
};

/**
 * GET /api/auth/openai/authorize
 *
 * 1. Generates PKCE verifier/challenge + random state
 * 2. Starts a temporary HTTP server on port 1455 to capture the callback
 * 3. Returns the authorization URL for the frontend to open
 */
export const authorize = async (req, res) => {
  // Clean up any previous flow
  cleanupFlow();

  const state = base64url(randomBytes(24));
  const { verifier, challenge } = generatePkce();

  // Build authorization URL
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    id_token_add_organizations: "true",
    codex_cli_simplified_flow: "true",
    originator: "aios"
  });
  const authorizationUrl = `${AUTH_URL}?${params.toString()}`;

  // Create a promise that resolves when the callback is received
  const flowPromise = new Promise((resolve, reject) => {
    const server = createServer((cbReq, cbRes) => {
      const cbUrl = new URL(cbReq.url, `http://localhost:${CALLBACK_PORT}`);

      if (!cbUrl.pathname.startsWith("/auth/callback")) {
        cbRes.writeHead(404);
        cbRes.end("Not Found");
        return;
      }

      const code = cbUrl.searchParams.get("code");
      const returnedState = cbUrl.searchParams.get("state");
      const error = cbUrl.searchParams.get("error");

      // Return a page that tells the user they can close the window
      cbRes.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });

      if (error) {
        const desc = cbUrl.searchParams.get("error_description") || error;
        cbRes.end(`<!DOCTYPE html><html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#1a1a1a;color:#e0e0e0"><div style="text-align:center"><h2>Authorization Failed</h2><p>${desc}</p><p style="color:#888">You can close this window.</p></div></body></html>`);
        resolve({ error: desc });
        return;
      }

      if (returnedState !== state) {
        cbRes.end(`<!DOCTYPE html><html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#1a1a1a;color:#e0e0e0"><div style="text-align:center"><h2>State Mismatch</h2><p style="color:#888">Please try again.</p></div></body></html>`);
        resolve({ error: "state mismatch" });
        return;
      }

      cbRes.end(`<!DOCTYPE html><html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#1a1a1a;color:#e0e0e0"><div style="text-align:center"><h2 style="color:#10a37f">Authorization Successful</h2><p style="color:#888">You can close this window and return to AIOS.</p></div></body></html>`);
      resolve({ code });
    });

    server.on("error", (err) => {
      reject(new Error(`Failed to start callback server on port ${CALLBACK_PORT}: ${err.message}`));
    });

    server.listen(CALLBACK_PORT, "127.0.0.1", () => {
      // Server started successfully
    });

    activeFlow = {
      server,
      state,
      codeVerifier: verifier,
      resolve,
      timeout: setTimeout(() => {
        resolve({ error: "timeout" });
        cleanupFlow();
      }, 5 * 60 * 1000) // 5 minute timeout
    };
  });

  // Store the flow promise for the poll endpoint
  activeFlow.promise = flowPromise;

  return json(res, {
    success: true,
    authorizationUrl
  });
};

/**
 * POST /api/auth/openai/poll
 *
 * Frontend polls this endpoint to check if the OAuth callback was received.
 * When the user completes login in the browser, the callback server captures
 * the code, and this endpoint exchanges it for tokens.
 */
export const poll = async (req, res) => {
  if (!activeFlow || !activeFlow.promise) {
    return json(res, { success: false, status: "no_flow", message: "No active OAuth flow" }, 400);
  }

  // Save references before any async work (activeFlow may be cleared by concurrent polls)
  const flowPromise = activeFlow.promise;
  const codeVerifier = activeFlow.codeVerifier;

  // Check if the callback has been received (non-blocking with race)
  const timeout = new Promise((r) => setTimeout(() => r({ pending: true }), 200));
  const result = await Promise.race([flowPromise, timeout]);

  if (result.pending) {
    return json(res, { success: true, status: "pending" });
  }

  // Callback received — clean up the server
  cleanupFlow();

  if (result.error) {
    return json(res, { success: false, status: "error", message: result.error });
  }

  // Exchange authorization code for tokens
  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        code: result.code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier
      })
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      const errMsg = tokenData.error_description || tokenData.error || "Token exchange failed";
      return json(res, { success: false, status: "error", message: errMsg }, 400);
    }

    // Extract accountId from JWT access_token
    let accountId = "";
    try {
      const parts = tokenData.access_token.split(".");
      if (parts.length >= 2) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        accountId = payload?.["https://api.openai.com/auth"]?.chatgpt_account_id || "";
      }
    } catch {}

    // Store OAuth tokens
    saveSetting("authMethod", "oauth");
    saveSetting("oauthAccessToken", tokenData.access_token);
    saveSetting("oauthAccountId", accountId);
    if (tokenData.refresh_token) {
      saveSetting("oauthRefreshToken", tokenData.refresh_token);
    }
    if (tokenData.expires_in) {
      saveSetting("oauthTokenExpiresAt", String(Date.now() + tokenData.expires_in * 1000));
    }

    // Auto-set provider and apiUrl for OpenAI Codex
    saveSetting("provider", "openai");
    saveSetting("apiUrl", "https://api.openai.com/v1/chat/completions");

    return json(res, {
      success: true,
      status: "complete",
      message: "OAuth login successful"
    });
  } catch (err) {
    return json(res, {
      success: false,
      status: "error",
      message: `Token exchange failed: ${err.message}`
    }, 500);
  }
};

/**
 * POST /api/auth/openai/refresh
 * Refreshes the OAuth access token using the stored refresh token.
 */
export const refresh = async (req, res) => {
  const settings = getSettings();
  const refreshToken = settings.oauthRefreshToken;

  if (!refreshToken) {
    return json(res, { success: false, message: "No refresh token available" }, 400);
  }

  try {
    const result = await refreshOAuthToken(refreshToken);
    if (result.error) {
      return json(res, { success: false, message: result.error }, 401);
    }
    return json(res, { success: true, message: "Token refreshed" });
  } catch (err) {
    return json(res, { success: false, message: `Token refresh failed: ${err.message}` }, 500);
  }
};

/**
 * Shared refresh logic — also used by LLM layer for auto-refresh.
 */
export const refreshOAuthToken = async (refreshToken) => {
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      refresh_token: refreshToken
    })
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || !tokenData.access_token) {
    // Don't reset authMethod here — let the caller decide.
    // The existing access token may still work even if refresh fails.
    return { error: tokenData.error_description || tokenData.error || "Token refresh failed" };
  }

  saveSetting("oauthAccessToken", tokenData.access_token);
  // Update accountId from new token
  try {
    const parts = tokenData.access_token.split(".");
    if (parts.length >= 2) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
      const acctId = payload?.["https://api.openai.com/auth"]?.chatgpt_account_id || "";
      if (acctId) saveSetting("oauthAccountId", acctId);
    }
  } catch {}
  if (tokenData.refresh_token) {
    saveSetting("oauthRefreshToken", tokenData.refresh_token);
  }
  if (tokenData.expires_in) {
    saveSetting("oauthTokenExpiresAt", String(Date.now() + tokenData.expires_in * 1000));
  }
  return { accessToken: tokenData.access_token };
};

/**
 * POST /api/auth/openai/manual-tokens
 * Debug: manually set access/refresh tokens without going through OAuth flow.
 */
export const manualTokens = async (req, res) => {
  const { readBody } = await import("../../../shared/http/readBody.js");
  const body = await readBody(req);
  const { accessToken, refreshToken } = body || {};
  if (!accessToken) {
    return json(res, { success: false, message: "accessToken is required" }, 400);
  }

  // Extract accountId from JWT
  let accountId = "";
  try {
    const parts = accessToken.split(".");
    if (parts.length >= 2) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
      accountId = payload?.["https://api.openai.com/auth"]?.chatgpt_account_id || "";
    }
  } catch {}

  saveSetting("authMethod", "oauth");
  saveSetting("oauthAccessToken", accessToken);
  saveSetting("oauthAccountId", accountId);
  if (refreshToken) saveSetting("oauthRefreshToken", refreshToken);
  // Set expiration: try to read from JWT, otherwise default to 1 hour
  let expiresIn = 3600;
  try {
    const parts = accessToken.split(".");
    if (parts.length >= 2) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
      if (payload.exp) {
        expiresIn = payload.exp - Math.floor(Date.now() / 1000);
        if (expiresIn < 0) expiresIn = 3600;
      }
    }
  } catch {}
  saveSetting("oauthTokenExpiresAt", String(Date.now() + expiresIn * 1000));
  saveSetting("provider", "openai");
  saveSetting("apiUrl", "https://api.openai.com/v1/chat/completions");

  return json(res, { success: true, accountId });
};

/**
 * POST /api/auth/openai/disconnect
 * Clears OAuth tokens and reverts to API key auth.
 */
export const disconnect = async (req, res) => {
  cleanupFlow();
  saveSetting("authMethod", "apikey");
  saveSetting("oauthAccessToken", "");
  saveSetting("oauthAccountId", "");
  saveSetting("oauthRefreshToken", "");
  saveSetting("oauthTokenExpiresAt", "");
  return json(res, { success: true, message: "OAuth disconnected" });
};
