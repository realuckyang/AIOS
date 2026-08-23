// 系统端点:App 与 Boot 之间的重启握手。
import { json, readBody } from '../../../shared/http.js';
import * as restarts from '../repository/restarts.js';
import * as events from '../events.js';

export const prefix = 'system';

export async function handle({ req, res, parts, config, canRestartApp, requestAppRestart }) {
  if (parts[2] !== 'restarts') return json(res, 404, { error: 'not found' });
  const id = parts[3];

  if (!id && req.method === 'POST') {
    const body = await readBody(req, config.requestBodyMaxBytes);
    const request = restarts.createRestartRequest(body);
    events.publish('restart_requested', { request });
    json(res, 201, request);
  } else if (id === 'pending' && req.method === 'GET') {
    json(res, 200, restarts.getPendingRestart());
  } else if (id && parts[4] === 'confirm' && req.method === 'POST') {
    canRestartApp();
    const request = restarts.confirmRestartRequest(id);
    if (!request) json(res, 409, { error: '重启申请不存在或已处理' });
    else {
      events.publish('restart_confirmed', { request });
      json(res, 202, request);
      setImmediate(() => requestAppRestart());
    }
  } else if (id && parts.length === 4 && req.method === 'DELETE') {
    const cancelled = restarts.cancelRestartRequest(id);
    if (cancelled) events.publish('restart_cancelled', { id });
    json(res, cancelled ? 200 : 409, cancelled ? { cancelled: true } : { error: '重启申请不存在或已处理' });
  } else {
    json(res, 404, { error: 'not found' });
  }
}
