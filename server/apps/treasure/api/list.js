import { fetchTreasureList } from '../service/list.js';

export const listHandler = (query = {}) => {
  return fetchTreasureList(query);
};
