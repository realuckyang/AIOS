import { getPartiesByLang } from '../repository/parties.js';

export const listParties = (body = {}) => {
  const lang = String(body.lang || 'zh').trim() || 'zh';
  return getPartiesByLang(lang);
};
