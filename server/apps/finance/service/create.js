import { createTransaction } from '../repository/create.js';

export const createFinance = (body = {}) => {
  const type = String(body.type || '').trim();
  const amount = Number(body.amount);
  const note = String(body.note || '');

  if (!['income', 'expense'].includes(type)) {
    return { success: false, message: 'type 必须是 income 或 expense' };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, message: 'amount 必须是大于 0 的数字' };
  }

  const date = body.date ? String(body.date) : undefined;
  createTransaction({ type, amount, note, date });
  return { success: true };
};
