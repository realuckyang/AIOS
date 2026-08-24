import { readBody } from '../../../shared/http/readBody.js';
import { json } from '../../../shared/http/json.js';
import { initTreasureDatabase } from '../repository/init.js';
import { uploadHandler } from './upload.js';
import { appraiseHandler } from './appraise.js';
import { listHandler } from './list.js';
import { detailHandler } from './detail.js';
import { deleteHandler } from './delete.js';
import { imageHandler } from './image.js';

export { initTreasureDatabase };

export const handleTreasureApi = async (req, res, path) => {
  if (path === '/apps/treasure/upload' && req.method === 'POST') {
    const body = await readBody(req);
    const data = await uploadHandler(body);
    if (data?.status) return json(res, { success: false, message: data.message }, data.status);
    return json(res, data);
  }

  if (path === '/apps/treasure/appraise' && req.method === 'POST') {
    const body = await readBody(req);
    const data = await appraiseHandler(body, req);
    if (data?.status) return json(res, { success: false, message: data.message }, data.status);
    return json(res, data);
  }

  if (path === '/apps/treasure/list' && req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return json(res, listHandler({
      page: url.searchParams.get('page'),
      pageSize: url.searchParams.get('pageSize')
    }));
  }

  if (path === '/apps/treasure/detail' && req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const data = detailHandler({ id: url.searchParams.get('id') });
    if (data?.status) return json(res, { success: false, message: data.message }, data.status);
    return json(res, data);
  }

  if (path === '/apps/treasure/image' && req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return imageHandler(res, { id: url.searchParams.get('id') });
  }

  if (path === '/apps/treasure/delete' && req.method === 'POST') {
    const body = await readBody(req);
    const data = deleteHandler(body);
    if (data?.status) return json(res, { success: false, message: data.message }, data.status);
    return json(res, data);
  }

  return false;
};
