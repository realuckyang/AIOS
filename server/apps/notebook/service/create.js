import { createNote } from '../repository/create.js';

export const createNotebook = async (body = {}) => {
  const content = String(body.content || '');
  const style = body.style != null ? Number(body.style) : Math.floor(Math.random() * 12);
  const id = createNote({ content, style });
  return { id };
};
