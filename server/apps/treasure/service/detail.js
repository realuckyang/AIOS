import { getTreasureDetail } from '../repository/detail.js';

export const fetchTreasureDetail = (query = {}) => {
  const id = Number(query.id || 0);
  if (!id) return { status: 400, message: '缺少 id' };

  const detail = getTreasureDetail(id);
  if (!detail) return { status: 404, message: '藏品不存在' };
  return { success: true, detail };
};
