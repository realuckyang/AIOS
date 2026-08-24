import { fetchTreasureDetail } from '../service/detail.js';

export const detailHandler = (query = {}) => {
  return fetchTreasureDetail(query);
};
