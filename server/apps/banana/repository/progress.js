import { db } from "./client.js";
const getLatestSession = () => {
  return db.prepare(`
    SELECT current_screen, battery_level
    FROM banana_sessions
    ORDER BY id DESC
    LIMIT 1
  `).get();
};
export {
  getLatestSession
};
