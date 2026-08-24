import { readBody } from "../../../shared/http/readBody.js";
import { json } from "../../../shared/http/json.js";
import { divine } from "../service/divine.js";
import { list } from "../service/list.js";
const handleFortuneApi = async (req, res, path) => {
  if (path === "/apps/fortune/divine" && req.method === "POST") {
    const body = await readBody(req);
    const question = String(body.question || "").trim();
    if (!question) return json(res, { success: false, message: "Question is required" }, 400);
    const hexagram = String(body.hexagram || "").trim();
    const prompt = String(body.prompt || "").trim();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const taskTitle = String(body.taskTitle || "").trim();
    let data = null;
    try {
      data = await divine({ question, hexagram, prompt, messages, taskTitle, req });
    } catch (e) {
      data = { status: 500, message: e.message || "Divination failed" };
    }
    if (data?.status) return json(res, { success: false, message: data.message }, data.status);
    return json(res, data);
  }
  if (path === "/apps/fortune/list" && req.method === "GET") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return json(res, list({
      page: url.searchParams.get("page"),
      pageSize: url.searchParams.get("pageSize")
    }));
  }
  return false;
};
export {
  handleFortuneApi
};
