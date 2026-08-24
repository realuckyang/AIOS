import { deleteNoteById } from '../repository/delete.js';

export const deleteNotebook = (body = {}) => {
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return { error: '缺少 id', status: 400 };
  deleteNoteById(id);
  return { ok: true };
};
