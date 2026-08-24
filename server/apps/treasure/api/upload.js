import { handleUpload } from '../service/upload.js';

export const uploadHandler = async (body = {}) => {
  return handleUpload(body);
};
