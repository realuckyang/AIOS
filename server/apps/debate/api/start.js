import { startDebate } from '../service/start.js';

export const startHandler = async (body = {}, req) => {
  return startDebate(body, req);
};
