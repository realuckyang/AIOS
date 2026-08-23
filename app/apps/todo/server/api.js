// 待办的命名端点。id 是 8 位 hex,不会与 'done' 撞路由。
import { json, readBody } from '../../../shared/http.js';
import * as repo from './repository.js';

export const prefix = 'todos';

export async function handle({ req, res, parts, config }) {
  const id = parts[2];
  if (!id && req.method === 'GET') {
    json(res, 200, repo.listTodos());
  } else if (!id && req.method === 'POST') {
    const body = await readBody(req, config.requestBodyMaxBytes);
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) json(res, 400, { error: 'title 必须是非空字符串' });
    else json(res, 201, repo.createTodo(title));
  } else if (id === 'done' && req.method === 'DELETE') {
    json(res, 200, { cleared: repo.clearDoneTodos() });
  } else if (id && parts.length === 3 && req.method === 'PATCH') {
    const body = await readBody(req, config.requestBodyMaxBytes);
    if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim())) {
      json(res, 400, { error: 'title 必须是非空字符串' });
      return;
    }
    const todo = repo.updateTodo(id, {
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.done !== undefined ? { done: Boolean(body.done) } : {}),
    });
    if (todo) json(res, 200, todo);
    else json(res, 404, { error: `待办不存在: ${id}` });
  } else if (id && parts.length === 3 && req.method === 'DELETE') {
    if (repo.removeTodo(id)) json(res, 200, { ok: true });
    else json(res, 404, { error: `待办不存在: ${id}` });
  } else {
    json(res, 404, { error: 'not found' });
  }
}
