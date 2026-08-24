import { handleRssreaderApi } from "./api/index.js";
import { initRssreaderDatabase } from "./repository/init.js";
var stdin_default = {
  name: "rssreader",
  match: (path) => path.startsWith("/apps/rssreader/"),
  initDb: initRssreaderDatabase,
  handleApi: handleRssreaderApi
};
export { stdin_default as default };
