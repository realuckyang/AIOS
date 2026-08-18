# HTTP API

API 面向 UI 和 AI 提供同一套能力。创建带消息的对话或向对话发送消息时，对话会自动运行；没有 `start`、`resume` 或 `subscribe` 操作。

## 对话

### `GET /api/chats`

返回对话列表，供左侧栏使用。左侧栏默认请求 `origin=user`，不显示异步调用创建的执行对话。

可选查询参数：

- `limit`：返回数量
- `origin`：按 `user` 或 `call` 筛选来源

列表项包含：

```json
{
  "id": "chat_id",
  "title": "对话标题",
  "description": "对话描述",
  "origin": "user",
  "status": "idle",
  "createdAt": 0,
  "updatedAt": 0
}
```

### `POST /api/chats`

创建用户顶层对话，`origin` 固定为 `user`。该接口供 UI 在用户发送首条消息时使用；不能用来创建派生对话。没有 `message` 时只创建；带有 `message` 时创建后自动运行。

一条对话需要创建或调用另一条执行对话时，必须使用 `POST /api/chats/:id/calls`。该接口会把新目标标记为 `origin=call` 并保存发起关系，使它只显示在当前对话的“执行对话”面板中。

```json
{
  "title": "可选标题",
  "description": "可选描述",
  "context": "可选的共享上下文",
  "message": "可选的第一条指令"
}
```

返回完整的对话对象。带 `message` 时返回状态通常为 `running`；不带消息时为 `idle`：

```json
{
  "id": "chat_id",
  "status": "running"
}
```

`context` 和 `message` 都属于输入侧，写为 `source=user`。共享部分还是全部上下文由调用方决定，存储层不区分。

### `GET /api/chats/:id`

返回一条对话的基础信息、当前运行状态、最近一次运行错误和压缩记录：

```json
{
  "id": "chat_id",
  "title": "对话标题",
  "description": "",
  "origin": "user",
  "status": "idle",
  "createdAt": 0,
  "updatedAt": 0,
  "error": "",
  "compactions": []
}
```

### `PATCH /api/chats/:id`

修改标题或描述。

```json
{
  "title": "新标题",
  "description": "新描述"
}
```

### `DELETE /api/chats/:id`

删除对话。后端会先停止该对话当前运行，再删除记录。

## 内容

### `GET /api/chats/:id/items`

返回对话内容，供中央消息流和调用详情使用。

每一行的 `item` 是标准 Responses API item；`source` 是数据库信封字段，不在 `item` 内：

```json
{
  "id": 123,
  "chatId": "chat_id",
  "item": {
    "type": "message",
    "role": "user",
    "content": "执行结果"
  },
  "source": "runtime",
  "usage": null,
  "createdAt": 0
}
```

`source` 只允许 `user`、`model`、`tool`、`runtime`。它描述 item 的写入来源，与 `item.role` 和 `item.type` 相互独立。

可选查询参数：

- `after`：只返回该 item ID 之后的内容
- `before`：返回该 item ID 之前的内容
- `limit`：与 `after` 或 `before` 一起使用时限制返回数量；不带游标时返回该对话全部 items

### `POST /api/chats/:id/messages`

向已有对话发送消息。写入成功后，如果对话空闲则自动运行；如果对话正在运行，则在后续步骤读取新消息。

该接口写入的消息来源固定为 `source=user`。Agent 派发或继续执行对话时不使用此接口，而是使用当前对话的 `/calls` 接口并传入 `toChatId`。

```json
{
  "content": "新的指令"
}
```

返回写入的 item ID 和对话状态：

```json
{
  "itemId": 123,
  "status": "running"
}
```

### `POST /api/chats/:id/stop`

停止对话当前运行。不会删除对话、历史或已经产生的修改。

```json
{
  "stopped": true
}
```

## 异步调用

### `POST /api/chats/:id/calls`

由对话 `:id` 发起一次异步调用。

创建新对话并调用：

```json
{
  "title": "可选标题",
  "description": "可选描述",
  "context": "调用方选择并整理的上下文",
  "message": "交给新对话的指令"
}
```

调用已有对话：

```json
{
  "toChatId": "已有对话 ID",
  "context": "可选的补充上下文",
  "message": "新的指令"
}
```

接口立即返回，不等待目标对话完成：

```json
{
  "callId": "call_id",
  "chatId": "target_chat_id",
  "requestItemId": 123,
  "status": "running"
}
```

目标对话结束后，框架自动将结果以 `source=runtime` 写回发起对话，并更新 `calls.response_item_id` 和调用状态。

### `GET /api/chats/:id/calls`

返回该对话发起的调用，供右侧调用面板使用。

### `GET /api/chats/:id/created-chats`

返回当前对话通过异步调用创建的所有目标对话，供右侧对话面板使用。

```json
{
  "id": "target_chat_id",
  "title": "执行对话",
  "description": "",
  "origin": "call",
  "status": "idle",
  "callStatus": "completed",
  "createdAt": 0,
  "updatedAt": 0
}
```

点击后使用目标对话 ID 请求其详情和 items。执行对话面板是只读视图，不提供输入框。`calls` 仍保存每一次调用记录；该接口只是面向 UI 的目标对话视图。

### `GET /api/calls/:id`

返回一次调用的双方、请求 item、响应 item、状态和时间。

停止调用不需要单独接口。UI 取得 `toChatId` 后调用：

```text
POST /api/chats/:toChatId/stop
```

## Settings

### `GET /api/settings`

返回全部有效配置。`llm.key` 只返回是否已配置，不返回明文。

### `PUT /api/settings/:key`

写入一个配置：

```json
{ "value": "deepseek/deepseek-v4-flash" }
```

支持 `llm.responses_url`、`llm.key`、`llm.model`、`context.window`、`context.reserve`、`context.keep_recent`、`context.live_result_chars`、`prompt.chat` 和 `prompt.compaction`。`llm.responses_url` 必须是包含最终路径的完整 Responses API 地址，后端直接请求该值，不追加路径。模型服务密钥是发送模型请求的必需配置。对话提示词可使用 `{{chat_id}}` 与 `{{api_url}}` 占位符。

## 事件

### `GET /api/events`

UI 建立一条 SSE 连接，接收对话内容、运行状态和调用状态变化。订阅由 UI 和框架维护，不是 AI 的操作能力。

主要事件：

- `input`
- `reasoning`
- `message`
- `tool_calls`
- `tool_results`
- `compaction`
- `status`
- `call`
- `done`
- `error`
- `gap`

每种事件的字段、落库规则和客户端处理方式见 [event.md](event.md)。

断开 SSE 不会停止任何对话。客户端使用事件 ID 断点续传；收到 `gap` 时重新请求对应对话的 items 和 calls。

## AI 可直接使用的能力

AI 可通过 `bash` 调用以上 HTTP API。对 AI 暴露的核心动作只有：

- `call`：通过当前对话的 `/calls` 接口创建或调用执行对话
- `call existing`：在 `/calls` 请求中传入 `toChatId`，继续已有执行对话
- `stop`：停止指定对话当前运行

查询可以通过只读 API 或 SQLite 完成；事件订阅和结果回传由框架自动处理。
