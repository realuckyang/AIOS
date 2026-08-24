import { updateNoteContent } from '../repository/update.js';

export const updateNotebook = (body = {}) => {
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return { error: '缺少 id', status: 400 };
  updateNoteContent({ id, content: body.content || '' });
  return { ok: true };
};
