import { countRecords, listRecords } from "../repository/list.js";
const list = (query = {}) => {
  const page = Math.max(1, Number(query.page || 1));
  const pageSize = Math.max(1, Math.min(50, Number(query.pageSize || 20)));
  const offset = (page - 1) * pageSize;
  const total = countRecords();
  const items = listRecords({ limit: pageSize, offset });
  return { success: true, items, total, page, pageSize };
};
export {
  list
};
