import { handleTreasureApi, initTreasureDatabase } from "./api/index.js";

export default {
  name: "treasure",
  match: (path) => path.startsWith("/apps/treasure/"),
  initDb: initTreasureDatabase,
  handleApi: handleTreasureApi
};
