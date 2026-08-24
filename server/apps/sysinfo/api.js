import { json } from "../../shared/http/json.js";
import * as svc from "./service.js";

const handleSysinfoApi = async (req, res, path) => {
  if (path === "/apps/sysinfo/snapshot" && req.method === "GET") {
    return json(res, await svc.snapshot());
  }
  return false;
};

export { handleSysinfoApi };
