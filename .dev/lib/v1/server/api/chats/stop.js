import { stop } from '../../service/chats/index.js';
export const handler = ({ res, params, json }) => json(res, stop(params.id));
