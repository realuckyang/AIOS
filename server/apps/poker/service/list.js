import { listGames } from "../repository/game.js";
const getGameList = (query = {}) => {
  const page = Math.max(1, Number(query.page || 1));
  const pageSize = Math.max(1, Math.min(50, Number(query.pageSize || 20)));
  const offset = (page - 1) * pageSize;
  const { items, total } = listGames({ pageSize, offset });
  return { success: true, items, total, page, pageSize };
};
export {
  getGameList
};
