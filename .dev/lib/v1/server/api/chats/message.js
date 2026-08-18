import { message } from '../../service/chats/index.js';
export const handler = ({ res, params, body, json }) => json(res, message(params.id, body?.content));
