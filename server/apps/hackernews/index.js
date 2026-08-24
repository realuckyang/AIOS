import { handleHackernewsApi } from "./api/index.js";
import { initHackernewsDatabase } from "./repository/init.js";

export default {
  name: "hackernews",
  match: (path) => path.startsWith("/apps/hackernews/"),
  initDb: initHackernewsDatabase,
  handleApi: handleHackernewsApi
};
