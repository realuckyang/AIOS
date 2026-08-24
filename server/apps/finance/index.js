import { handleFinanceApi } from './api/index.js';
import { initFinanceDatabase } from './repository/init.js';

export default {
  name: 'finance',
  match: (path) => path.startsWith('/apps/finance/'),
  initDb: initFinanceDatabase,
  handleApi: handleFinanceApi
};
