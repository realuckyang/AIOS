import { getLatest } from '../service/latest.js';

export const latestHandler = () => {
  return getLatest();
};
