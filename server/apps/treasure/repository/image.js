import { db } from './client.js';

export const getImagePath = (id) => {
  const row = db.prepare('SELECT image_path FROM apps_treasures WHERE id = ?').get(id);
  return row?.image_path || null;
};
