import { create } from '../../service/chats/index.js';
export const handler = ({ res, body, json }) => json(res, create(body ?? {}), 201);
