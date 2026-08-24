import { advanceDebate } from '../service/debate.js';

export const debateHandler = async (body = {}, req) => {
  return advanceDebate(body, req);
};
