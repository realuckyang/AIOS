import { handlePokerApi } from "./api/index.js";
import { initPokerDatabase } from "./repository/init.js";
var stdin_default = {
  name: "poker",
  match: (path) => path.startsWith("/apps/poker/"),
  initDb: initPokerDatabase,
  handleApi: handlePokerApi
};
export {
  stdin_default as default
};
