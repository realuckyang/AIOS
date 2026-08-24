import { deleteTreasure } from '../repository/delete.js';

export const removeTreasure = (body = {}) => {
  const id = Number(body.id || 0);
  if (!id) return { status: 400, message: '缺少 id' };

  const info = deleteTreasure(id);
  if (!info.changes) return { status: 404, message: '藏品不存在' };
  return { success: true };
};
