import { db } from './client.js';

export const insertAppraisal = ({ imagePath, name, category, condition, summaryTag, value, comment }) => {
  return db.prepare(`
    INSERT INTO apps_treasures (image_path, name, category, condition_text, summary_tag, value, comment)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(imagePath, name, category, condition, summaryTag, value, comment);
};

export const getAppraisalById = (id) => {
  return db.prepare(`
    SELECT id, name, category, condition_text, summary_tag, value, comment, created_at
    FROM apps_treasures
    WHERE id = ?
  `).get(id);
};
