import { db } from "./client.js";
import { toDateKey } from "../../../shared/time/dateKey.js";
const persistEquity = (equity) => {
  db.prepare("INSERT INTO cryptobot_equity (equity, created_at) VALUES (?, datetime('now'))").run(equity);
};
const getTodayChange = (currentEquity) => {
  const todayStr = toDateKey();
  const first = db.prepare("SELECT equity FROM cryptobot_equity WHERE date(created_at) = ? ORDER BY id ASC LIMIT 1").get(todayStr);
  if (!first) return 0;
  return currentEquity - first.equity;
};
export {
  getTodayChange,
  persistEquity
};
