import { db } from "./client.js";
const insertSession = ({ currentScreen, screenHistory }) => {
  db.prepare(`
    INSERT INTO banana_sessions (current_screen, screen_history)
    VALUES (?, ?)
  `).run(
    JSON.stringify(currentScreen),
    JSON.stringify(screenHistory)
  );
};
export {
  insertSession
};
