import { listCreated } from '../../service/chats/index.js';
export const handler = ({ res, params, json }) => json(res, listCreated(params.id));
