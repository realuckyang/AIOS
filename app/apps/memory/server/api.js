// 记忆的命名端点。id 是 8 位 hex,不会与 'tags' 撞路由。
import { json, readBody } from '../../../shared/http.js';
import * as repo from './repository.js';

export const prefix = 'memories';

export async function handle({ req, res, parts, url, config }) {
  const id = parts[2];
  if (!id && req.method === 'GET' && url.searchParams.get('tag')) {
    json(res, 200, repo.listMemories({ tag: url.searchParams.get('tag') }));
  } else if (!id && req.method === 'GET') {
    json(res, 200, repo.listMemories());
  } else if (!id && req.method === 'POST') {
    const body = await readBody(req, config.requestBodyMaxBytes);
    try {
      const source = body.source === 'agent' || body.source === 'runtime' ? body.source : 'manual';
      json(res, 201, repo.createMemory({ title: body.title, body: body.body, tags: body.tags, source }));
    } catch (err) {
      json(res, 400, { error: String(err?.message ?? err) });
    }
  } else if (id === 'tags' && req.method === 'GET') {
    json(res, 200, repo.memoryTags());
  } else if (id && parts.length === 3 && req.method === 'GET') {
    const memory = repo.getMemory(id);
    if (memory) json(res, 200, memory);
    else json(res, 404, { error: `记忆不存在: ${id}` });
  } else if (id && parts.length === 3 && req.method === 'PATCH') {
    const body = await readBody(req, config.requestBodyMaxBytes);
    try {
      const memory = repo.updateMemory(id, body);
      if (memory) json(res, 200, memory);
      else json(res, 404, { error: `记忆不存在: ${id}` });
    } catch (err) {
      json(res, 400, { error: String(err?.message ?? err) });
    }
  } else if (id && parts.length === 3 && req.method === 'DELETE') {
    if (repo.removeMemory(id)) json(res, 200, { ok: true });
    else json(res, 404, { error: `记忆不存在: ${id}` });
  } else {
    json(res, 404, { error: 'not found' });
  }
}
