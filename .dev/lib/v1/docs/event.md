# SSE 事件

服务端通过 `GET /api/events` 向 UI 推送实时事件。事件用于增量更新界面；数据库中的 `chats`、`items`、`compactions` 和 `calls` 仍然是最终事实。

## 事件信封

除 `gap` 外，业务事件都包含：

```json
{
  "id": 123,
  "type": "message",
  "chatId": "chat_id"
}
```

- `id`：全局递增的事件 ID，用于 SSE 断点续传。
- `type`：事件类型。
- `chatId`：事件所属或需要更新的对话。
- `at`：服务端发布事件时的毫秒时间戳。

与异步调用有关的事件可以额外携带 `callId` 和 `toChatId`。

下文示例为突出各事件自身字段，部分省略了公共信封中的 `id`。

## 事件类型

```text
input
reasoning
message
tool_calls
tool_results
compaction
status
call
done
error
gap
```

## 内容事件

### `input`

有一条外部内容进入对话，并且已经写入 `items`。

```json
{
  "id": 123,
  "type": "input",
  "chatId": "chat_a",
  "itemId": 45,
  "item": {
    "type": "message",
    "role": "user",
    "content": "继续检查数据库"
  },
  "source": "user"
}
```

输入可能来自：

- 当前 UI 中的用户
- API
- 另一条对话
- 异步调用的结果回传
- 框架写入的上下文

已经落库的内容事件会在 `item` 外层携带 `source`。允许值为：

- `user`：输入侧消息，包括用户输入、上下文和执行对话收到的任务
- `model`：模型定稿内容
- `tool`：工具执行结果
- `runtime`：执行对话完成后写回发起对话的结果

`source` 不属于 Responses API item，不得写进 `item` JSON。

当前 UI 可以先乐观显示自己发送的消息，但仍然必须处理服务端的 `input` 事件，并使用 item ID 去重。否则无法收到其他窗口和其他对话写入的内容。

异步调用的结果回传可以携带调用信息：

```json
{
  "type": "input",
  "chatId": "chat_a",
  "callId": "call_xxx",
  "itemId": 72,
  "item": {
    "type": "message",
    "role": "user",
    "content": "目标对话返回的结果"
  },
  "source": "runtime"
}
```

### `reasoning`

模型的推理过程。

流式增量：

```json
{
  "type": "reasoning",
  "chatId": "chat_a",
  "delta": "先检查"
}
```

最终定稿：

```json
{
  "type": "reasoning",
  "chatId": "chat_a",
  "itemId": 73,
  "item": {
    "type": "reasoning",
    "summary": []
  },
  "source": "model"
}
```

带 `delta` 的事件不落库；带 `item` 的事件已经写入 `items`。

### `message`

模型输出的正文。

流式增量：

```json
{
  "type": "message",
  "chatId": "chat_a",
  "delta": "已经"
}
```

最终定稿：

```json
{
  "type": "message",
  "chatId": "chat_a",
  "itemId": 74,
  "item": {
    "type": "message",
    "role": "assistant",
    "content": "已经检查完成。"
  },
  "source": "model"
}
```

带 `delta` 的事件不落库；带 `item` 的事件已经写入 `items`。

### `tool_calls`

模型发起的一批 bash 调用，调用 items 已经写入数据库。

```json
{
  "type": "tool_calls",
  "chatId": "chat_a",
  "items": [
    {
      "itemId": 75,
      "item": {
        "type": "function_call",
        "name": "bash",
        "call_id": "tool_xxx",
        "arguments": "{\"command\":\"rg TODO .\"}"
      },
      "source": "model"
    }
  ]
}
```

### `tool_results`

bash 调用产生的结果，结果 items 已经写入数据库。

```json
{
  "type": "tool_results",
  "chatId": "chat_a",
  "items": [
    {
      "itemId": 76,
      "item": {
        "type": "function_call_output",
        "call_id": "tool_xxx",
        "output": "命令输出"
      },
      "source": "tool"
    }
  ]
}
```

### `compaction`

上下文压缩完成，并且已经写入 `compactions`。

```json
{
  "type": "compaction",
  "chatId": "chat_a",
  "compaction": {
    "id": 8,
    "startItemId": 1,
    "endItemId": 60,
    "text": "此前已经完成数据库结构设计。",
    "createdAt": 1750000000
  }
}
```

`compaction` 不是 Responses item，因此不写入 `items`，也没有持久化的 `source` 字段。它属于 Runtime 的上下文机制；组装下一次模型请求时，框架将摘要临时转换为 `role=system` 的 message 放入 input。

## 状态事件

### `status`

对话运行状态变化。状态同时写入 `chats.status`。

服务启动时，框架必须将数据库中遗留的 `running` 重置为 `idle`。进程退出后没有仍在执行的运行，不能让旧状态永久留在 UI 中。

开始运行：

```json
{
  "type": "status",
  "chatId": "chat_a",
  "status": "running"
}
```

变为空闲：

```json
{
  "type": "status",
  "chatId": "chat_a",
  "status": "idle"
}
```

### `call`

一次异步调用的状态变化。状态同时写入 `calls`。

```json
{
  "type": "call",
  "chatId": "chat_a",
  "callId": "call_xxx",
  "toChatId": "chat_b",
  "requestItemId": 77,
  "responseItemId": null,
  "status": "running",
  "createdAt": 1750000000,
  "completedAt": null
}
```

调用状态包括：

- `pending`
- `running`
- `completed`
- `cancelled`
- `failed`

### `done`

一轮模型循环正常收工。

```json
{
  "type": "done",
  "chatId": "chat_a",
  "steps": 8,
  "completed": true
}
```

- `steps`：本轮模型调用步数。
- `completed: true`：模型正常结束。Agent 不设置最大执行步数。

`done` 不表示对话永久结束。对话随后通过 `status` 事件变为 `idle`，收到新消息后可以再次运行。

### `error`

一轮运行异常失败。

```json
{
  "type": "error",
  "chatId": "chat_a",
  "message": "上游返回的原始错误正文"
}
```

异步调用失败时还应将对应 `calls.status` 更新为 `failed`，并发送 `call` 事件。

`error` 是瞬时运行事件，不写入 `items`，因此没有 `source`。后端保存当前运行错误状态，`GET /api/chats/:id` 会返回 `error`；前端同时处理 API 状态与 SSE，避免切换新对话时丢失过早到达的错误事件。下一次运行开始或服务重启后，该错误状态清除。

模型服务返回非成功 HTTP 状态时，`message` 使用上游响应正文，不在本地翻译或改写；响应正文为空时才退回 HTTP 状态码与状态文本。

## 传输事件

### `gap`

客户端断开太久，服务端无法完整补发丢失的事件。

```json
{
  "type": "gap",
  "id": 200
}
```

客户端收到后不能继续依赖本地增量状态，应重新请求当前数据：

```text
GET /api/chats
GET /api/chats/:id/items
GET /api/chats/:id/calls
```

断开 SSE 或收到 `gap` 都不会停止任何对话。

## Usage

`usage` 不是独立事件类型。一次模型步骤的用量附在该步骤最后一条定稿内容事件上：

```json
{
  "type": "message",
  "chatId": "chat_a",
  "item": {},
  "source": "model",
  "usage": {
    "input_tokens": 1000,
    "output_tokens": 80
  }
}
```

这样数据库和 UI 不需要猜测 usage 应该对应哪条 item。
