import { list } from '../../service/chats/index.js';
export const handler = ({ res, url, json }) => json(res, list({
  origin: url.searchParams.get('origin') || undefined,
  limit: Number(url.searchParams.get('limit')) || 100,
}));
