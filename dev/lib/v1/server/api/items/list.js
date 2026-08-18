import { listItems } from '../../service/chats/index.js';
export const handler = ({ res, params, url, json }) => json(res, listItems(params.id, {
  after: Number(url.searchParams.get('after')) || undefined,
  before: Number(url.searchParams.get('before')) || undefined,
  limit: Number(url.searchParams.get('limit')) || 500,
}));
