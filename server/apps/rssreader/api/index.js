import { readBody } from "../../../shared/http/readBody.js";
import { json } from "../../../shared/http/json.js";
import { fetchFeed } from "../service/fetch.js";
import { summarize } from "../service/summarize.js";
import { listFeeds, addFeed, removeFeed, addBookmark, removeBookmark, listBookmarks } from "../repository/feed.js";

const handleRssreaderApi = async (req, res, path) => {
  if (path === "/apps/rssreader/feeds" && req.method === "GET") {
    return json(res, { success: true, feeds: listFeeds() });
  }
  if (path === "/apps/rssreader/feed/add" && req.method === "POST") {
    const body = await readBody(req);
    addFeed({ name: body.name || body.url, url: body.url });
    return json(res, { success: true, feeds: listFeeds() });
  }
  if (path === "/apps/rssreader/feed/remove" && req.method === "POST") {
    const body = await readBody(req);
    removeFeed(body.id);
    return json(res, { success: true, feeds: listFeeds() });
  }
  if (path === "/apps/rssreader/fetch" && req.method === "GET") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const feedUrl = url.searchParams.get("url") || "";
    const data = await fetchFeed({ url: feedUrl });
    if (data?.status) return json(res, { success: false, message: data.message }, data.status);
    return json(res, data);
  }
  if (path === "/apps/rssreader/summarize" && req.method === "POST") {
    const body = await readBody(req);
    const data = await summarize(body);
    return json(res, data);
  }
  if (path === "/apps/rssreader/bookmarks" && req.method === "GET") {
    return json(res, { success: true, bookmarks: listBookmarks() });
  }
  if (path === "/apps/rssreader/bookmark/add" && req.method === "POST") {
    const body = await readBody(req);
    addBookmark({ feedId: body.feedId, title: body.title, url: body.url, summary: body.summary });
    return json(res, { success: true });
  }
  if (path === "/apps/rssreader/bookmark/remove" && req.method === "POST") {
    const body = await readBody(req);
    removeBookmark(body.id);
    return json(res, { success: true });
  }
  return false;
};

export { handleRssreaderApi };
