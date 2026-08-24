import { getConfig, saveConfig } from "../repository/config.js";
import { listReports, clearReports } from "../repository/reports.js";
import { triggerNow, isRunning } from "../runtime/index.js";

const decorate = (cfg) => ({ ...cfg, running: isRunning() });

const get = () => ({ success: true, config: decorate(getConfig()) });

const save = (body) => {
  const cfg = saveConfig(body || {});
  return { success: true, config: decorate(cfg) };
};

const reports = ({ limit = 50 } = {}) => ({
  success: true,
  items: listReports({ limit })
});

const runNow = async () => {
  await triggerNow();
  return { success: true };
};

const clear = () => {
  clearReports();
  return { success: true };
};

export { get, save, reports, runNow, clear };
