// 技能商店:代理讯飞 skillhub 公开 API 供浏览,并把技能包装进本地 skills/。
import { json, readBody } from '../../../shared/http.js';
import * as store from './repository.js';

export const prefix = 'skills-store';

export async function handle({ req, res, parts, url, config }) {
  const sub = parts[2];
  if (sub === 'list' && req.method === 'GET') {
    json(res, 200, await store.listStoreSkills(url.searchParams.get('cursor') ?? undefined));
  } else if (sub === 'skill' && req.method === 'GET') {
    const slug = url.searchParams.get('slug');
    if (!slug) json(res, 400, { error: '需要 slug 查询参数' });
    else json(res, 200, await store.getStoreSkill(slug));
  } else if (sub === 'installed' && req.method === 'GET') {
    json(res, 200, { slugs: store.listInstalled() });
  } else if (sub === 'uninstall' && req.method === 'POST') {
    const body = await readBody(req, config.requestBodyMaxBytes);
    const slug = typeof body.slug === 'string' ? body.slug : '';
    if (!slug) return json(res, 400, { error: '需要 slug' });
    try { json(res, 200, store.uninstallSkill(slug)); }
    catch (err) { json(res, 400, { error: String(err?.message ?? err) }); }
  } else if (sub === 'install' && req.method === 'POST') {
    const body = await readBody(req, config.requestBodyMaxBytes);
    const slug = typeof body.slug === 'string' ? body.slug : '';
    if (!slug) return json(res, 400, { error: '需要 slug' });
    try { json(res, 200, await store.installSkill(slug, { force: Boolean(body.force) })); }
    catch (err) { json(res, 400, { error: String(err?.message ?? err) }); }
  } else {
    json(res, 404, { error: 'not found' });
  }
}
