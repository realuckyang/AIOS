import { getSuggestions } from '../service/suggest.js';

export const suggestHandler = async (body = {}, req) => {
  return getSuggestions(body, req);
};
