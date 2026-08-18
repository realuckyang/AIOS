-- v2 内核 schema:两张表,再无其他。
-- 配置(模型服务地址、密钥、模型名、提示词)在库外,不属于内核数据。

CREATE TABLE chats (
  id                     TEXT PRIMARY KEY,
  title                  TEXT NOT NULL DEFAULT '',
  description            TEXT NOT NULL DEFAULT '',   -- 自由字段;「worker of chat X」等结构约定写在这里
  status                 TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running')),
  context_start_item_id  INTEGER,                    -- 遗忘原语:input 只取该点之后的 items;NULL 表示从头
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL
);

CREATE TABLE items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id     TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  source      TEXT NOT NULL CHECK (source IN ('user', 'runtime', 'model', 'tool')),
  item        TEXT NOT NULL,                         -- 标准 Responses API item,JSON 原文
  usage       TEXT,                                  -- 该次模型定稿的真实 token 用量,JSON
  created_at  TEXT NOT NULL
);

CREATE INDEX idx_items_chat ON items(chat_id, id);
