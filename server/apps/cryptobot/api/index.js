import { readBody } from "../../../shared/http/readBody.js";
import { json } from "../../../shared/http/json.js";
import { getAgent, saveAgent, startAgent, stopAgent, testAgentExchange } from "../service/agent.js";
import { listDecisionRecords } from "../service/decision.js";
import { getPositions } from "../service/positions.js";
import { listOrders } from "../service/trade.js";
import { getMarket } from "../service/market.js";

const handleCryptobotApi = async (req, res, path) => {
  if (path === "/apps/cryptobot/agent" && req.method === "GET") {
    return json(res, await getAgent());
  }
  if (path === "/apps/cryptobot/agent" && req.method === "POST") {
    const body = await readBody(req);
    return json(res, saveAgent(body));
  }
  if (path === "/apps/cryptobot/agent/exchange/test" && req.method === "POST") {
    const body = await readBody(req);
    return json(res, await testAgentExchange(body));
  }
  if (path === "/apps/cryptobot/agent/start" && req.method === "POST") {
    const body = await readBody(req);
    return json(res, await startAgent(body));
  }
  if (path === "/apps/cryptobot/agent/stop" && req.method === "POST") {
    return json(res, stopAgent());
  }
  if (path === "/apps/cryptobot/decision/records" && req.method === "GET") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const limit = Number(url.searchParams.get("limit") || 50);
    return json(res, listDecisionRecords({ limit }));
  }
  if (path === "/apps/cryptobot/positions" && req.method === "GET") {
    return json(res, await getPositions());
  }
  if (path === "/apps/cryptobot/trade/orders" && req.method === "GET") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const instType = url.searchParams.get("instType") || "ANY";
    const limit = Number(url.searchParams.get("limit") || 50);
    return json(res, await listOrders({ instType, limit }));
  }
  if (path === "/apps/cryptobot/market" && req.method === "GET") {
    return json(res, await getMarket());
  }
  return false;
};

export { handleCryptobotApi };
