import { appraiseItem } from '../service/appraise.js';

export const appraiseHandler = async (body = {}, req) => {
  return appraiseItem(body, req);
};
