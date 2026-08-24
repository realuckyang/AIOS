import { listNotes } from '../repository/list.js';

export const listNotebook = ({ q = '', page = 1, pageSize = 10 } = {}) => {
  return listNotes({ keyword: q, page, pageSize });
};
