-- 当前核心 DDL，与根目录 schema.sql 的表结构和索引保持一致。
-- 默认 settings 数据由根目录 schema.sql 初始化，本文件只展示结构。

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

-- source 是 item 外层的写入来源，不属于 Responses API item JSON：
-- user    用户输入、上下文和执行对话收到的任务
-- model   模型产生的 message、reasoning 和 function_call
-- tool    bash 产生的 function_call_output
-- runtime 执行对话完成后写回发起对话的结果

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

CREATE INDEX IF NOT EXISTS chats_recent ON chats(origin, updated_at DESC);
CREATE INDEX IF NOT EXISTS items_of_chat ON items(chat_id, id);
CREATE INDEX IF NOT EXISTS compactions_of_chat ON compactions(chat_id, id);
CREATE INDEX IF NOT EXISTS calls_of_chat ON calls(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS calls_to_chat ON calls(to_chat_id, created_at DESC);
