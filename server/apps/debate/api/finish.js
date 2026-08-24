import { finishDebate } from '../service/finish.js';

export const finishHandler = async (body = {}, req) => {
  return finishDebate(body, req);
};
