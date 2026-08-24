import { db } from "./client.js";
const insertRecord = ({ question, signName, signPoem, good, bad, advice, hexagram }) => {
  const ret = db.prepare(`
    INSERT INTO fortune_records (question, sign_name, sign_poem, good, bad, advice, hexagram)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(question, signName, signPoem, good, bad, advice, hexagram);
  return db.prepare(`
    SELECT id, question, sign_name AS signName, sign_poem AS signPoem, good, bad, advice, hexagram, created_at AS createdAt
    FROM fortune_records WHERE id = ?
  `).get(ret.lastInsertRowid);
};
export {
  insertRecord
};
