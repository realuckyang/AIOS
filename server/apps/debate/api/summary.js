import { getTopicSummary } from '../service/summary.js';

export const summaryHandler = async (body = {}, req) => {
  return getTopicSummary(body, req);
};
