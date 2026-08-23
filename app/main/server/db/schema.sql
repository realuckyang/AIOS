-- 框架库 var/aios.db。只装框架自己的事实;应用的事实在 var/apps/<id>.db。
--
-- 主干是 threads:一切消息流的身份。chat 与 task 是它的两种侧写,
-- 各自只存「作为产品对象」的字段;「作为消息流运转」所必需的字段(context_start)
-- 一律留在主干上,messages/usage/compactions 三张挂表也只认 thread_id。

CREATE TABLE IF NOT EXISTS threads (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL CHECK (kind IN ('chat', 'task')),
  context_start INTEGER NOT NULL DEFAULT 0 CHECK (context_start >= 0),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS threads_kind ON threads(kind, updated_at DESC);

-- 对话线的侧写:给人看的字段。
CREATE TABLE IF NOT EXISTS chats (
  id          TEXT PRIMARY KEY REFERENCES threads(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  pinned_at   TEXT              -- 非 NULL = 置顶,值即置顶时间(新置顶在上)
);

-- 任务线的侧写:非用户发起的模型请求。压缩摘要是它的第一个使用者,
-- 将来的应用调用、模型自调用走同一条路 —— 于是记账没有例外通道。
CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY REFERENCES threads(id) ON DELETE CASCADE,
  app         TEXT NOT NULL,    -- 归属应用;框架自己发起的记 'main'
  title       TEXT NOT NULL DEFAULT '',
  mode        TEXT NOT NULL CHECK (mode IN ('instant', 'agent')),
  status      TEXT NOT NULL CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'cancelled')),
  response    TEXT,
  error       TEXT,
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS tasks_app ON tasks(app, status);

-- 消息。带 usage 的行同时记下当时的模型、单价快照与折算成本:
-- 成本从此是「写下来的事实」,不再是每次渲染按现价重算的估算。
-- 存单价是为了可审计 —— 折算逻辑将来若有 bug,还能重算回来。
CREATE TABLE IF NOT EXISTS messages (
  thread_id    TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  seq          INTEGER NOT NULL CHECK (seq > 0),
  source       TEXT NOT NULL CHECK (source IN ('user', 'runtime', 'model', 'tool')),
  item         TEXT NOT NULL CHECK (json_valid(item)),
  usage        TEXT CHECK (usage IS NULL OR json_valid(usage)),
  model        TEXT,
  cost         REAL,
  currency     TEXT,
  price_in     REAL,
  price_cached REAL,
  price_out    REAL,
  at           TEXT NOT NULL,
  PRIMARY KEY (thread_id, seq)
);

CREATE INDEX IF NOT EXISTS messages_latest ON messages(thread_id, seq DESC);

-- 每线程每模型的累计(计费口径)。appendItem 落带 usage 的行时同事务增量维护,
-- 读取 O(1)。派生自 messages,是缓存不是真相 —— 但必须与 messages 同事务,
-- 否则两边漂移了没法判断哪边对。按模型分行:换模型不会让旧 token 被按新价重算。
CREATE TABLE IF NOT EXISTS usage (
  thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  model     TEXT NOT NULL,
  input     INTEGER NOT NULL DEFAULT 0,
  cached    INTEGER NOT NULL DEFAULT 0,
  output    INTEGER NOT NULL DEFAULT 0,
  cost      REAL    NOT NULL DEFAULT 0,
  currency  TEXT    NOT NULL DEFAULT '',
  PRIMARY KEY (thread_id, model)
);

-- 上下文压缩的产物。每条覆盖 (上一条 end_seq, 本条 end_seq] 区间,
-- 只追加不重写:旧摘要永不参与再压缩,前缀因此稳定,压缩不会打掉缓存命中。
CREATE TABLE IF NOT EXISTS compactions (
  thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  start_seq INTEGER NOT NULL CHECK (start_seq > 0),
  end_seq   INTEGER NOT NULL CHECK (end_seq >= start_seq),
  summary   TEXT NOT NULL,
  kind      TEXT NOT NULL CHECK (kind IN ('summary', 'mechanical')),
  tokens    INTEGER NOT NULL DEFAULT 0,
  at        TEXT NOT NULL,
  PRIMARY KEY (thread_id, end_seq)
);

-- 设置。只存被改过的键:默认值在代码里,恢复默认就是删掉这一行。
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL CHECK (json_valid(value)),
  at    TEXT NOT NULL
);

-- App 与 Boot 之间的重启握手:agent 提申请,人确认,App 向 Boot 发 SIGHUP。
CREATE TABLE IF NOT EXISTS restarts (
  id           TEXT PRIMARY KEY,
  summary      TEXT NOT NULL,
  reason       TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL CHECK (status IN ('pending', 'restarting', 'succeeded', 'cancelled')),
  created_at   TEXT NOT NULL,
  confirmed_at TEXT,
  completed_at TEXT,
  instance_id  TEXT,
  target_chat  TEXT
);

CREATE INDEX IF NOT EXISTS restarts_status ON restarts(status, created_at DESC);
