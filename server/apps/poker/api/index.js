import { readBody } from "../../../shared/http/readBody.js";
import { json } from "../../../shared/http/json.js";
import { getPokerEconomy } from "../repository/economy.js";
import { startGame } from "../service/start.js";
import { performAction } from "../service/action.js";
import { getGameState } from "../service/state.js";
import { getGameList } from "../service/list.js";
const handlePokerApi = async (req, res, path) => {
  if (path === "/apps/poker/status" && req.method === "GET") {
    const economy = getPokerEconomy();
    return json(res, { success: true, economy });
  }
  if (path === "/apps/poker/start" && req.method === "POST") {
    const data = startGame();
    if (data?.status) return json(res, { success: false, message: data.message }, data.status);
    return json(res, data);
  }
  if (path === "/apps/poker/action" && req.method === "POST") {
    const body = await readBody(req);
    const id = Number(body.id || 0);
    const action = String(body.action || "");
    const data = await performAction({ id, action, req });
    if (data?.status) return json(res, { success: false, message: data.message }, data.status);
    return json(res, data);
  }
  if (path === "/apps/poker/state" && req.method === "GET") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const data = getGameState({ id: url.searchParams.get("id") });
    if (data?.status) return json(res, { success: false, message: data.message }, data.status);
    return json(res, data);
  }
  if (path === "/apps/poker/list" && req.method === "GET") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return json(res, getGameList({
      page: url.searchParams.get("page"),
      pageSize: url.searchParams.get("pageSize")
    }));
  }
  return false;
};
export {
  handlePokerApi
};
