// 应用的库工厂。一个应用一个文件:var/apps/<name>.db。
//
// 这是应用能拿到的唯一数据库句柄 —— 框架库 var/aios.db 的 client 只被
// main/server/repository/* 导入,apps/ 下没有任何路径能通到它。
// 老 AIOS 把这条当约定,结果主库里混进了 notes / cc_conversations;
// 这一版让它成为「拿不到」,并由 bin/hooks/check-boundaries 在启动时复核。
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { VAR_DIR } from '../../../host.js';

const APPS_DIR = path.join(VAR_DIR, 'apps');
const open = new Map();

export function createAppDb(name, schemaSql = '') {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new Error(`应用名非法: ${name}`);
  const cached = open.get(name);
  if (cached) return cached;
  fs.mkdirSync(APPS_DIR, { recursive: true });
  const db = new DatabaseSync(path.join(APPS_DIR, `${name}.db`));
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  if (schemaSql) db.exec(schemaSql);
  open.set(name, db);
  return db;
}
