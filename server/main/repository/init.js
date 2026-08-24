import { dirname, resolve } from "path";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { db } from "./client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..", "..", "..");

const createTables = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      title TEXT,
      description TEXT DEFAULT '',
      scene TEXT NOT NULL DEFAULT 'chat',
      meta TEXT,
      state TEXT NOT NULL DEFAULT 'idle',
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      message TEXT NOT NULL,
      meta TEXT,
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conv_remark
      ON messages(conversation_id, id DESC) WHERE remark IS NOT NULL;

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS contexts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      access TEXT NOT NULL DEFAULT 'none',
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(source, source_id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT,
      app TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      mode TEXT NOT NULL DEFAULT 'agent',
      prompt TEXT NOT NULL,
      schema TEXT,
      meta TEXT,
      response TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS auth (
      id            INTEGER PRIMARY KEY CHECK (id = 1),
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      api_token     TEXT NOT NULL,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cc_conversations (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id      TEXT NOT NULL UNIQUE,
      cwd             TEXT NOT NULL DEFAULT '',
      permission_mode TEXT NOT NULL DEFAULT 'default',
      title           TEXT NOT NULL DEFAULT '',
      message_count   INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cc_events (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES cc_conversations(id) ON DELETE CASCADE,
      seq             INTEGER NOT NULL,
      kind            TEXT NOT NULL,
      raw_json        TEXT NOT NULL,
      ts              TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cc_events_conv_seq ON cc_events(conversation_id, seq);

    CREATE TABLE IF NOT EXISTS notes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL DEFAULT '',
      body        TEXT NOT NULL DEFAULT '',
      pinned      INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_notes_pinned_updated
      ON notes(pinned DESC, updated_at DESC);
  `);
};

// 老库平滑加列(SQLite 单独一条 ALTER 才不会因为列已存在直接 fail). 全部包 try/catch.
const migrateContexts = () => {
  const safeAdd = (sql) => { try { db.exec(sql); } catch {} };
  safeAdd("ALTER TABLE contexts ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0");
  safeAdd("ALTER TABLE contexts ADD COLUMN created_at TEXT DEFAULT (datetime('now'))");
};

const seedSystemContexts = () => {
  const file = resolve(projectRoot, ".aios", "system-contexts.json");
  if (!existsSync(file)) return;
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    console.warn("[db] failed to read system contexts:", error?.message || error);
    return;
  }
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  if (!items.length) return;
  const stmt = db.prepare(`
    INSERT INTO contexts (source, source_id, title, summary, content, access, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(source, source_id) DO UPDATE SET
      title = excluded.title,
      summary = excluded.summary,
      content = excluded.content,
      access = excluded.access,
      updated_at = datetime('now')
  `);
  for (const item of items) {
    const source = String(item.source || "system").trim() || "system";
    const sourceId = String(item.sourceId || "").trim();
    if (!sourceId) continue;
    const access = ["summary", "full"].includes(String(item.access || "")) ? String(item.access) : "full";
    stmt.run(
      source,
      sourceId,
      String(item.title || ""),
      String(item.summary || ""),
      String(item.content || ""),
      access
    );
  }
};

const initDatabase = () => {
  createTables();
  migrateContexts();
  seedSystemContexts();
};

export {
  initDatabase
};
