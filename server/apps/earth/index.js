import { handleEarthApi } from "./api/index.js";

export default {
  name: "earth",
  match: (path) => path.startsWith("/apps/earth/"),
  handleApi: handleEarthApi
};
