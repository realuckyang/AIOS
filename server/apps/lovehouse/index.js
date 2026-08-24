import { handleLovehouseApi } from "./api/index.js";
import { initLovehouseDatabase } from "./repository/init.js";

export default {
    name: "lovehouse",
    match: (path) => path.startsWith("/apps/lovehouse/"),
    initDb: initLovehouseDatabase,
    handleApi: handleLovehouseApi
};
