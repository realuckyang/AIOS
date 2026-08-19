import { create } from '../../service/calls/index.js';
export const handler = ({ res, params, body, json }) => json(res, create(params.id, body ?? {}), 202);
