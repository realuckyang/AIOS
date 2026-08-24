import { removeTreasure } from '../service/delete.js';

export const deleteHandler = (body = {}) => {
  return removeTreasure(body);
};
