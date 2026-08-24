import { getConfig } from "../repository/config.js";
import { fetchBalances, fetchPositions } from "../runtime/okx.js";

const getPositions = async () => {
  const cfg = getConfig();
  if (!cfg.api_key || !cfg.api_secret || !cfg.passphrase) {
    return { success: false, message: "Configure OKX API Key/Secret/Passphrase first" };
  }
  try {
    const [balances, positions] = await Promise.all([
      fetchBalances(cfg).catch((e) => ({ error: e.message })),
      fetchPositions(cfg).catch((e) => ({ error: e.message })),
    ]);
    return {
      success: true,
      balances: balances?.error ? null : balances,
      positions: Array.isArray(positions) ? positions : [],
      balancesError: balances?.error || null,
      positionsError: positions?.error || null,
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
};

export { getPositions };
