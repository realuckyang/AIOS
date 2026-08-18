# 接口

系统有两套本地 HTTP 接口,职责不同:

```text
人 / Agent / UI → App API :9523 → Kernel run API :9522
```

## App API:对话与持久状态

日常使用只需要 App API。它维护 `var/aios.db`,负责事务、seq、元数据、分页、调度和 UI 事件。

```text
GET    /api/chats
POST   /api/chats
GET    /api/chats/:id
PATCH  /api/chats/:id
DELETE /api/chats/:id
POST   /api/chats/:id/stop
GET    /api/chats/:id/items
POST   /api/chats/:id/messages
GET    /api/events
GET    /api/config
PATCH  /api/config
GET    /api/skills
GET    /api/skills/:id
GET    /api/health
POST   /api/system/restarts
GET    /api/system/restarts/pending
POST   /api/system/restarts/:id/confirm
DELETE /api/system/restarts/:id
```

`GET /api/config` 返回当前可编辑配置；`PATCH /api/config` 校验字符串、非负整数和端口范围后，通过临时文件原子替换 `etc/config.json`。App 内存参数会同步更新，Kernel、Boot 和端口等参数需重启整套系统后生效。该接口包含 `apiKey`，因此 App 只应绑定在本机回环地址。

`GET /api/skills` 扫描根级 `skills/*/SKILL.md` 并返回列表元数据；`GET /api/skills/:id` 返回 Skill 详情和完整 Markdown。这两个接口属于 App/userland，Kernel 不发现、读取或解释 Skills。

AI 通过 `POST /api/system/restarts` 创建待确认重启申请，App SSE 向前端发布 `restart_requested`。只有用户调用 `confirm` 后 App 才向 Boot 发送 `SIGHUP`。`GET /api/health` 返回每个 App 进程唯一的 `instanceId`；前端检测到新实例后刷新，超时才直连 Kernel 发送普通修复消息。

`POST /messages` 请求体:

```json
{ "content": "...", "source": "user" }
```

`source` 只允许 `user` 或 `runtime`。消息先由 App 持久化,再触发一次 Kernel run。对话运行中收到新消息时,App 会在当前 run 结束后再运行一次,不会丢失唤醒。

结构化检查可直接查询 `var/aios.db`。特殊修复前通常先 `npm stop`，修复后再 `npm start`，避免与 App 事务并发。`GET /api/chats/:id/items?limit=50&before=<seq>` 使用 `(chat_id, seq)` 索引从最新记录向前分页。

## Kernel API:一次运行

Kernel 不读取 chat 或磁盘历史。App 选择上下文后提交完整 input，并附带仅用于状态行的运行元数据：

```text
POST /api/runs
GET  /api/runs/:runId
POST /api/runs/:runId/stop
```

`POST /api/runs`:

```json
{
  "runId": "chat-or-run-id",
  "input": [],
  "state": {
    "chatId": "...",
    "latestSeq": 12,
    "contextStart": 0,
    "lastUsage": null,
    "appApiBase": "http://127.0.0.1:9523/api"
  }
}
```

响应是本次请求内的 SSE:`message`、`reasoning`、`item`、`tool_result`、`error`、`done`。Kernel 在内存把本轮模型 item 和工具结果继续加入 input；run 结束即释放。

## App SSE

UI 订阅 `GET /api/events`。事件类型保持为 `status`、`input`、`reasoning`、`message`、`tool_calls`、`tool_results`、`done`、`error`、`gap`。定稿 item 在通知 UI 之前已经写入 `var/`;SSE 只是易逝通知。

## Console

`npm run console` 是随 Kernel 发行的人类终端客户端。正常时连接 App API,与 UI 使用同一套 chats 和事件协议；App 不可用时自动直连 Kernel run API,并在 CLI 内存保存临时历史。
