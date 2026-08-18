import * as service from '../../service/settings/index.js';

export const listSettings = ({ res, json }) => json(res, service.list());
export const setSetting = ({ res, params, body, json }) => json(res, service.set(params.key, body?.value));
