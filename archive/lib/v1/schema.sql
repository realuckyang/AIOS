CREATE TABLE IF NOT EXISTS chats (
  id          TEXT PRIMARY KEY,
  title       TEXT    NOT NULL DEFAULT '',
  description TEXT    NOT NULL DEFAULT '',
  origin      TEXT    NOT NULL DEFAULT 'user',
  status      TEXT    NOT NULL DEFAULT 'idle',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id     TEXT    NOT NULL,
  item        TEXT    NOT NULL,
  source      TEXT    NOT NULL CHECK (source IN ('user', 'model', 'tool', 'runtime')),
  usage       TEXT,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS compactions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id        TEXT    NOT NULL,
  start_item_id  INTEGER NOT NULL,
  end_item_id    INTEGER NOT NULL,
  text           TEXT    NOT NULL,
  created_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS calls (
  id                TEXT PRIMARY KEY,
  chat_id           TEXT    NOT NULL,
  to_chat_id        TEXT    NOT NULL,
  request_item_id   INTEGER,
  response_item_id  INTEGER,
  status            TEXT    NOT NULL,
  created_at        INTEGER NOT NULL,
  completed_at      INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('llm.responses_url', ''),
  ('llm.key', ''),
  ('llm.model', ''),
  ('context.window', '1048576'),
  ('context.reserve', '16000'),
  ('context.keep_recent', '20000'),
  ('context.live_result_chars', '8000'),
  ('prompt.chat', '你是一个本地编码 Agent。你只有 bash 工具。
通过 shell 操作文件、运行命令和验证结果。
对话能力由上层 HTTP API 提供；需要时可通过 bash 调用 API。
API 地址：{{api_url}}。
当前对话 ID：{{chat_id}}'),
  ('prompt.compaction', '压缩下面的会话历史，使后续工作能继续。保留目标、决定、修改、验证、约束和未完成事项。只输出摘要正文。');

CREATE INDEX IF NOT EXISTS chats_recent ON chats(origin, updated_at DESC);
CREATE INDEX IF NOT EXISTS items_of_chat ON items(chat_id, id);
CREATE INDEX IF NOT EXISTS compactions_of_chat ON compactions(chat_id, id);
CREATE INDEX IF NOT EXISTS calls_of_chat ON calls(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS calls_to_chat ON calls(to_chat_id, created_at DESC);
