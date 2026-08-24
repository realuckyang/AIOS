// CJS-side handle to the AIOS SQLite (meem 应用 — claude-code / 后续 task 等用).
// 复用 server/main/repository/client.js 指向的同一个 database/aios.db 文件.
// better-sqlite3 在同一进程里多次 open 同一个文件是支持的(WAL 自管),
// 这里只在第一次 getDb() 时 open,之后复用.
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.resolve(__dirname, '..', '..', '..', 'database', 'aios.db');
let cached = null;

function getDb() {
    if (!cached) cached = new Database(dbPath);
    return cached;
}

module.exports = { getDb };
