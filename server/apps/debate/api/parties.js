import { listParties } from '../service/parties.js';

export const partiesHandler = (body = {}) => {
  return listParties(body);
};
