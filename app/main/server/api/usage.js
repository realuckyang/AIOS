// 用量端点。成本取落库时算定的值,不按现价重算。
import { json } from '../../../shared/http.js';
import * as usage from '../service/usage.js';

export const prefix = 'usage';

export async function handle({ req, res, parts, url, config }) {
  if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed' });
  const currency = config.priceCurrency;
  const granularity = url.searchParams.get('granularity') === 'hour' ? 'hour' : 'day';
  // 历史成本已落库,这里只是告诉界面「当前是否配了价」——没配时新消息成本会是 0。
  const hasPrice = (Number(config.priceInputPerMTokens) || 0) > 0
    || (Number(config.priceOutputPerMTokens) || 0) > 0;

  if (parts.length === 2) {
    json(res, 200, { ...usage.overview(currency), hasPrice });
  } else if (parts[2] === 'trend') {
    json(res, 200, { ...usage.trend(granularity, currency), hasPrice });
  } else if (parts[2] === 'threads') {
    json(res, 200, { ...usage.byThread(currency), hasPrice });
  } else if (parts[2] === 'models') {
    json(res, 200, { ...usage.byModel(currency), hasPrice });
  } else {
    json(res, 404, { error: 'not found' });
  }
}
