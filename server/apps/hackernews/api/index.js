import { readBody } from "../../../shared/http/readBody.js";
import { json } from "../../../shared/http/json.js";
import { list } from "../service/list.js";
import { detail } from "../service/detail.js";
import { summarize } from "../service/summarize.js";
import { addBookmark, removeBookmark, listBookmarks } from "../repository/bookmark.js";

const handleHackernewsApi = async (req, res, path) => {
  if (path === "/apps/hackernews/list" && req.method === "GET") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const type = url.searchParams.get("type") || "top";
    const data = await list({ type });
    return json(res, data);
  }
  if (path === "/apps/hackernews/detail" && req.method === "GET") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const id = Number(url.searchParams.get("id") || 0);
    const data = await detail({ id });
    if (data?.status) return json(res, { success: false, message: data.message }, data.status);
    return json(res, data);
  }
  if (path === "/apps/hackernews/summarize" && req.method === "POST") {
    const body = await readBody(req);
    const data = await summarize(body);
    return json(res, data);
  }
  if (path === "/apps/hackernews/bookmarks" && req.method === "GET") {
    return json(res, { success: true, bookmarks: listBookmarks() });
  }
  if (path === "/apps/hackernews/bookmark" && req.method === "POST") {
    const body = await readBody(req);
    addBookmark({ hnId: body.hnId, title: body.title, url: body.url, by: body.by, score: body.score });
    return json(res, { success: true });
  }
  if (path === "/apps/hackernews/unbookmark" && req.method === "POST") {
    const body = await readBody(req);
    removeBookmark(body.hnId);
    return json(res, { success: true });
  }
  return false;
};

export { handleHackernewsApi };
