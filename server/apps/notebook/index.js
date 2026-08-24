import { handleNotebookApi } from './api/index.js';
import { initNotebookDatabase } from './repository/init.js';

export default {
  name: 'notebook',
  match: (path) => path.startsWith('/apps/notebook/'),
  initDb: initNotebookDatabase,
  handleApi: handleNotebookApi
};
