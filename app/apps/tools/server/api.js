import { json } from '../../../shared/http.js';
import { getTool, listTools } from './repository.js';

export const prefix = 'tools';

export async function handle({ req, res, parts }) {
  if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed' });
  if (parts.length === 2) return json(res, 200, listTools());
  const tool = getTool(parts[2]);
  if (tool) json(res, 200, tool);
  else json(res, 404, { error: `工具不存在: ${parts[2]}` });
}
