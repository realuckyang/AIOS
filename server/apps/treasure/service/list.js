import { listTreasures } from '../repository/list.js';

export const fetchTreasureList = (query = {}) => {
  const page = Math.max(1, Number(query.page || 1));
  const pageSize = Math.max(1, Math.min(100, Number(query.pageSize || 50)));
  const offset = (page - 1) * pageSize;

  const { list, total, totalWealth } = listTreasures({ pageSize, offset });
  return { success: true, list, total, totalWealth, page, pageSize };
};
