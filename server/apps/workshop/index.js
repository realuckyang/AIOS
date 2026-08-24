import { handleWorkshopApi } from "./api/index.js";
import { initDatabase } from "./repository/init.js";

export default {
  name: "workshop",
  match: (path) => path.startsWith("/apps/workshop/"),
  initDb: initDatabase,
  handleApi: handleWorkshopApi
};
