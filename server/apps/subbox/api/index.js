import { readBody } from "../../../shared/http/readBody.js";
import { json } from "../../../shared/http/json.js";
import * as svc from "../service/index.js";

const handleSubboxApi = async (req, res, path) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (path === "/apps/subbox/config" && req.method === "GET") {
    return json(res, svc.get());
  }
  if (path === "/apps/subbox/config" && req.method === "POST") {
    const body = await readBody(req);
    try { return json(res, svc.save(body)); }
    catch (e) { return json(res, { success: false, message: e.message }, 400); }
  }
  if (path === "/apps/subbox/run-now" && req.method === "POST") {
    try { return json(res, await svc.runNow()); }
    catch (e) { return json(res, { success: false, message: e.message }, 400); }
  }
  if (path === "/apps/subbox/reports" && req.method === "GET") {
    const limit = Number(url.searchParams.get("limit") || 50);
    return json(res, svc.reports({ limit }));
  }
  if (path === "/apps/subbox/reports/clear" && req.method === "POST") {
    return json(res, svc.clear());
  }
  return false;
};

export { handleSubboxApi };
