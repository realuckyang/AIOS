import { db } from './client.js';

export const deleteTransactionById = (id) => {
  db.prepare('DELETE FROM finance_transactions WHERE id = ?').run(id);
};
