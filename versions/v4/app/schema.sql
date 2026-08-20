-- 设置。只存被改过的键:默认值在代码里,恢复默认就是删掉这一行,
-- 加新设置也不用动库。value 是 JSON 标量。
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL CHECK (json_valid(value)),
  at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chats (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  context_start INTEGER NOT NULL DEFAULT 0 CHECK (context_start >= 0),
  pinned_at     TEXT,             -- 非 NULL = 置顶,值即置顶时间(新置顶在上)
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  seq     INTEGER NOT NULL CHECK (seq > 0),
  source  TEXT NOT NULL CHECK (source IN ('user', 'runtime', 'model', 'tool')),
  item    TEXT NOT NULL CHECK (json_valid(item)),
  usage   TEXT CHECK (usage IS NULL OR json_valid(usage)),
  at      TEXT NOT NULL,
  PRIMARY KEY (chat_id, seq)
);

CREATE INDEX IF NOT EXISTS items_latest ON items(chat_id, seq DESC);

-- 每对话 token 累计(计费口径)。appendItem 落带 usage 的行时同事务增量维护,
-- 读取 O(1);和 chats 主表分开,业务列不和统计列混住。
CREATE TABLE IF NOT EXISTS usage (
  chat_id TEXT PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
  input   INTEGER NOT NULL DEFAULT 0,
  cached  INTEGER NOT NULL DEFAULT 0,
  output  INTEGER NOT NULL DEFAULT 0
);

-- 待办应用(app/ui/src/apps/todo)的事实;agent 可经 /api/todos 或直接读库参与
CREATE TABLE IF NOT EXISTS todos (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  done       INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 记忆应用(app/ui/src/apps/memory):agent 与人类共用的持久化事实库。
-- agent 把环境盘点、结论、约定沉淀到这里;人类在 UI 里查看/编辑。
-- tags 是 JSON 字符串数组(如 ["cloudflare","machine"]),便于按主题检索。
CREATE TABLE IF NOT EXISTS memories (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  tags       TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags)),
  pinned     INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
  source     TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'agent', 'runtime')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS memories_updated ON memories(updated_at DESC);

CREATE TABLE IF NOT EXISTS restarts (
  id           TEXT PRIMARY KEY,
  summary      TEXT NOT NULL,
  reason       TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL CHECK (status IN ('pending', 'restarting', 'succeeded', 'cancelled')),
  created_at   TEXT NOT NULL,
  confirmed_at TEXT,
  completed_at TEXT,
  instance_id  TEXT,
  target_chat  TEXT              -- 重启完成后前端要跳回的对话 id(可空)
);

CREATE INDEX IF NOT EXISTS restarts_status ON restarts(status, created_at DESC);

-- 上下文压缩的产物。每条覆盖 (上一条 end_seq, 本条 end_seq] 区间,
-- 只追加不重写:旧摘要永不参与再压缩,前缀因此稳定,压缩不会打掉缓存命中。
CREATE TABLE IF NOT EXISTS compactions (
  chat_id   TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  start_seq INTEGER NOT NULL CHECK (start_seq > 0),
  end_seq   INTEGER NOT NULL CHECK (end_seq >= start_seq),
  summary   TEXT NOT NULL,
  kind      TEXT NOT NULL CHECK (kind IN ('summary', 'mechanical')),
  tokens    INTEGER NOT NULL DEFAULT 0,
  at        TEXT NOT NULL,
  PRIMARY KEY (chat_id, end_seq)
);
