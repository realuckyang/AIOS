// 全系统唯一打开框架库 var/aios.db 的地方。
// 只被 main/server/repository/* 导入 —— apps/ 下的任何代码都不该出现在它的调用者里,
// 应用要库只能从 apps/_shared/db.js 拿自己的 var/apps/<id>.db。
// 这条边界不是约定,是「拿不到」:见 bin/hooks/check-boundaries。
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { VAR_DIR } from '../../../../host.js';

const SCHEMA_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql');
const DB_FILE = path.join(VAR_DIR, 'aios.db');

let db;

export function database() {
  if (db) return db;
  fs.mkdirSync(VAR_DIR, { recursive: true });
  db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  db.exec(fs.readFileSync(SCHEMA_FILE, 'utf8'));
  return db;
}

export function ensureVarDir() {
  fs.mkdirSync(VAR_DIR, { recursive: true });
  fs.mkdirSync(path.join(VAR_DIR, 'files'), { recursive: true });
  fs.mkdirSync(path.join(VAR_DIR, 'apps'), { recursive: true });
  database();
}

// 事务包装:repository 里凡是多表一致的写入都走它。
export function transact(fn) {
  const conn = database();
  conn.exec('BEGIN IMMEDIATE');
  try {
    const result = fn(conn);
    conn.exec('COMMIT');
    return result;
  } catch (err) {
    conn.exec('ROLLBACK');
    throw err;
  }
}
