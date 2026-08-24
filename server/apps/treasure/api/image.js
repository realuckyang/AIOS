import { fetchImage } from '../service/image.js';

export const imageHandler = (res, query = {}) => {
  const id = Number(query.id || 0);
  if (!id) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: '缺少 id' }));
    return true;
  }

  const result = fetchImage(id);
  if (result.error) {
    res.writeHead(result.status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: result.message }));
    return true;
  }

  res.writeHead(200, { 'Content-Type': result.contentType });
  res.end(result.buffer);
  return true;
};
