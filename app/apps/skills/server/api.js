import { json } from '../../../shared/http.js';
import { getSkill, listSkills } from './repository.js';

export const prefix = 'skills';

export async function handle({ req, res, parts }) {
  if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed' });
  if (parts.length === 2) return json(res, 200, listSkills());
  const skill = getSkill(parts[2]);
  if (skill) json(res, 200, skill);
  else json(res, 404, { error: `Skill 不存在: ${parts[2]}` });
}
