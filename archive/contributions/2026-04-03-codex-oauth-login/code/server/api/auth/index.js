import { json } from "../../../shared/http/json.js";
import { login } from "./login.js";
import { register } from "./register.js";
import { logout } from "./logout.js";
import { me } from "./me.js";
import { changePassword } from "./password.js";
import { authorize, poll, refresh, disconnect, manualTokens } from "./openai-oauth.js";
const handleAuthApi = async (req, res, path) => {
  if (path === "/api/auth/register" && req.method === "POST") return register(req, res);
  if (path === "/api/auth/login" && req.method === "POST") return login(req, res);
  if (path === "/api/auth/logout" && req.method === "POST") return logout(req, res);
  if (path === "/api/auth/me" && req.method === "GET") return me(req, res);
  if (path === "/api/auth/password" && req.method === "POST") return changePassword(req, res);
  if (path === "/api/auth/openai/authorize" && req.method === "GET") return authorize(req, res);
  if (path === "/api/auth/openai/poll" && req.method === "POST") return poll(req, res);
  if (path === "/api/auth/openai/refresh" && req.method === "POST") return refresh(req, res);
  if (path === "/api/auth/openai/disconnect" && req.method === "POST") return disconnect(req, res);
  if (path === "/api/auth/openai/manual-tokens" && req.method === "POST") return manualTokens(req, res);
  return json(res, { success: false, message: "API endpoint not found" }, 404);
};
export {
  handleAuthApi
};
