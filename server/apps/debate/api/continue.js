import { continueDebate } from '../service/continue.js';

export const continueHandler = async (body = {}, req) => {
  return continueDebate(body, req);
};
