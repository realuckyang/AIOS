import { handleCivApi } from "./api/index.js";
import { initCivDatabase } from "./repository/init.js";

initCivDatabase();

export default {
  name: "civ",
  match: (path) => path.startsWith("/apps/civ/"),
  handleApi: handleCivApi
};
