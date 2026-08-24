import { readBody } from "../../shared/http/readBody.js";
import { json } from "../../shared/http/json.js";
import { getSettings } from "../service/settings/get.js";
import { updateSettings } from "../service/settings/update.js";
import { listSkills } from "../service/skills/list.js";
const handleSettingsApi = async (req, res, path) => {
  if (path === "/api/settings" && req.method === "GET") {
    const settings = getSettings();
    // Don't expose OAuth tokens to frontend
    const { oauthAccessToken, oauthAccountId, oauthRefreshToken, oauthTokenExpiresAt, ...safeSettings } = settings;
    // Indicate whether OAuth is connected
    safeSettings.oauthConnected = Boolean(oauthAccessToken);
    return json(res, safeSettings);
  }
  if (path === "/api/settings/skills" && req.method === "GET") {
    return json(res, {
      items: listSkills().map(({ content, ...skill }) => skill)
    });
  }
  if (path === "/api/settings" && req.method === "POST") {
    const body = await readBody(req);
    updateSettings(body);
    return json(res, getSettings());
  }
  return json(res, { error: "API endpoint not found" }, 404);
};
export {
  handleSettingsApi
};
