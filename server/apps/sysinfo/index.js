import { handleSysinfoApi } from "./api.js";

export default {
  name: "sysinfo",
  match: (path) => path.startsWith("/apps/sysinfo/"),
  handleApi: handleSysinfoApi,
};
