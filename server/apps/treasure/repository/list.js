import { db } from './client.js';

export const listTreasures = ({ pageSize, offset }) => {
  const list = db.prepare(`
    SELECT id, name, category, condition_text, summary_tag, value, comment, created_at
    FROM apps_treasures
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(pageSize, offset);

  const total = db.prepare('SELECT COUNT(*) AS c FROM apps_treasures').get().c;
  const totalWealth = db.prepare('SELECT COALESCE(SUM(value), 0) AS s FROM apps_treasures').get().s;
  return { list, total, totalWealth };
};
