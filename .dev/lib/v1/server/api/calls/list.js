import { list } from '../../service/calls/index.js';
export const handler = ({ res, params, json }) => json(res, list(params.id));
