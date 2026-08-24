import { handleSubboxApi } from "./api/index.js";
import { initDatabase } from "./repository/init.js";
import { initRuntime } from "./runtime/index.js";

export default {
  name: "subbox",
  match: (path) => path.startsWith("/apps/subbox/"),
  initDb: initDatabase,
  initRuntime,
  handleApi: handleSubboxApi
};
