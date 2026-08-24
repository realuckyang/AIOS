import { handleBananaApi } from "./api/index.js";
import { initBananaDatabase } from "./repository/init.js";
var stdin_default = {
  name: "banana",
  match: (path) => path.startsWith("/apps/banana/"),
  initDb: initBananaDatabase,
  handleApi: handleBananaApi
};
export {
  stdin_default as default
};
