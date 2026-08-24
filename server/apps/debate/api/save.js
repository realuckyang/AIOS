import { saveRecord } from '../service/save.js';

export const saveHandler = (body = {}) => {
  return saveRecord(body);
};
