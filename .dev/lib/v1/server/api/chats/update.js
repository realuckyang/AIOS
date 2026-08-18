import { update } from '../../service/chats/index.js';
export const handler = ({ res, params, body, json }) => json(res, update(params.id, body ?? {}));
