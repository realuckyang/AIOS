import { get } from '../../service/calls/index.js';
export function handler({ res, params, json }) {
  const call = get(params.id);
  if (!call) throw Object.assign(new Error('没有这次调用'), { status: 404 });
  json(res, call);
}
