import { readBody } from '../../../shared/http/readBody.js';
import { json } from '../../../shared/http/json.js';
import { initDebateDatabase } from '../repository/init.js';
import { partiesHandler } from './parties.js';
import { latestHandler } from './latest.js';
import { startHandler } from './start.js';
import { debateHandler } from './debate.js';
import { suggestHandler } from './suggest.js';
import { summaryHandler } from './summary.js';
import { continueHandler } from './continue.js';
import { finishHandler } from './finish.js';
import { saveHandler } from './save.js';

export { initDebateDatabase };

export const handleDebateApi = async (req, res, path) => {
  if (path === '/apps/debate/parties' && req.method === 'POST') {
    const body = await readBody(req);
    return json(res, partiesHandler(body));
  }

  if (path === '/apps/debate/latest' && req.method === 'GET') {
    return json(res, latestHandler());
  }

  if (path === '/apps/debate/start' && req.method === 'POST') {
    const body = await readBody(req);
    const data = await startHandler(body, req);
    if (data?.status) return json(res, { success: false, message: data.message }, data.status);
    return json(res, data);
  }

  if (path === '/apps/debate/debate' && req.method === 'POST') {
    const body = await readBody(req);
    const data = await debateHandler(body, req);
    if (data?.status) return json(res, { success: false, message: data.message }, data.status);
    return json(res, data);
  }

  if (path === '/apps/debate/suggest' && req.method === 'POST') {
    const body = await readBody(req);
    const data = await suggestHandler(body, req);
    if (data?.status) return json(res, { success: false, message: data.message }, data.status);
    return json(res, data);
  }

  if (path === '/apps/debate/summary' && req.method === 'POST') {
    const body = await readBody(req);
    const data = await summaryHandler(body, req);
    if (data?.status) return json(res, { success: false, message: data.message }, data.status);
    return json(res, data);
  }

  if (path === '/apps/debate/continue' && req.method === 'POST') {
    const body = await readBody(req);
    const data = await continueHandler(body, req);
    if (data?.status) return json(res, { success: false, message: data.message }, data.status);
    return json(res, data);
  }

  if (path === '/apps/debate/finish' && req.method === 'POST') {
    const body = await readBody(req);
    const data = await finishHandler(body, req);
    if (data?.status) return json(res, { success: false, message: data.message }, data.status);
    return json(res, data);
  }

  if (path === '/apps/debate/save' && req.method === 'POST') {
    const body = await readBody(req);
    const data = saveHandler(body);
    if (data?.status) return json(res, { success: false, message: data.message }, data.status);
    return json(res, data);
  }

  return false;
};
