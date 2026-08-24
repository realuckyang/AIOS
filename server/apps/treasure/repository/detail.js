import { db } from './client.js';

export const getTreasureDetail = (id) => {
  return db.prepare(`
    SELECT id, name, category, condition_text, summary_tag, value, comment, created_at
    FROM apps_treasures
    WHERE id = ?
  `).get(id);
};
