import { handleFortuneApi } from "./api/index.js";
import { initFortuneDatabase } from "./repository/init.js";
var stdin_default = {
  name: "fortune",
  match: (path) => path.startsWith("/apps/fortune/"),
  initDb: initFortuneDatabase,
  handleApi: handleFortuneApi
};
export {
  stdin_default as default
};
