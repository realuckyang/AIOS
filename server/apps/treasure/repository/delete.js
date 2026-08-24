import { db } from './client.js';

export const deleteTreasure = (id) => {
  return db.prepare('DELETE FROM apps_treasures WHERE id = ?').run(id);
};
