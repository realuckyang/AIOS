import { getConfig } from "../repository/config.js";
import { fetchOrderHistory } from "../runtime/okx.js";

const ALL_TYPES = ["SPOT", "SWAP", "FUTURES", "MARGIN"];

const listOrders = async ({ instType = "ANY", limit = 50 } = {}) => {
  const cfg = getConfig();
  if (!cfg.api_key || !cfg.api_secret || !cfg.passphrase) {
    return { success: false, message: "Configure OKX API Key/Secret/Passphrase first" };
  }
  try {
    if (instType === "ANY") {
      // OKX does not support instType=ANY, so fetch all supported types and merge them.
      const results = await Promise.all(
        ALL_TYPES.map((t) => fetchOrderHistory(cfg, { instType: t, limit }).catch(() => []))
      );
      const merged = results.flat().sort((a, b) => Number(b.cTime || 0) - Number(a.cTime || 0)).slice(0, limit);
      return { success: true, items: merged };
    }
    const items = await fetchOrderHistory(cfg, { instType, limit });
    return { success: true, items };
  } catch (e) {
    return { success: false, message: e.message };
  }
};

export { listOrders };
