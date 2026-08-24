import { handleDebateApi, initDebateDatabase } from "./api/index.js";

export default {
  name: "debate",
  match: (path) => path.startsWith("/apps/debate/"),
  initDb: initDebateDatabase,
  handleApi: handleDebateApi
};
