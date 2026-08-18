import { remove } from '../../service/chats/index.js';
export const handler = ({ res, params, json }) => json(res, remove(params.id));
