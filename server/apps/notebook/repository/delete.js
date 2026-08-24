import { db } from './client.js';

export const deleteNoteById = (id) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(id);
};
