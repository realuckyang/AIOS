import { db } from './client.js';

export const updateTransaction = (id, fields) => {
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(fields)) {
    if (['type', 'amount', 'note', 'date'].includes(k) && v !== undefined) {
      sets.push(`${k} = ?`);
      vals.push(v);
    }
  }
  if (!sets.length) return;
  vals.push(id);
  db.prepare(`UPDATE finance_transactions SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
};
