# 后端结构

后端采用 `API → Service → Repository` 的经典分层结构。`llm/` 是独立的 Responses API 适配层；`agent/` 负责模型与工具循环。两者都不参与 HTTP、数据库和对话编排。

## 目录

```text
server/
├── index.js
│
├── agent/
│   ├── index.js
│   ├── runner.js
│   ├── context.js
│   ├── compaction.js
│   ├── tools.js
│   ├── bash.js
│   └── safety.js
│
├── llm/
│   ├── index.js
│   ├── normalize.js
│   ├── stream.js
│   └── sse.js
│
├── api/
│   ├── index.js
│   ├── chats/
│   │   ├── index.js
│   │   ├── list.js
│   │   ├── create.js
│   │   ├── get.js
│   │   ├── update.js
│   │   ├── remove.js
│   │   ├── message.js
│   │   ├── stop.js
│   │   └── created.js
│   ├── items/
│   │   ├── index.js
│   │   └── list.js
│   ├── calls/
│   │   ├── index.js
│   │   ├── create.js
│   │   ├── get.js
│   │   └── list.js
│   ├── settings/
│   │   └── index.js
│   └── events/
│       ├── index.js
│       └── subscribe.js
│
├── service/
│   ├── chats/
│   │   ├── index.js
│   │   ├── create.js
│   │   ├── message.js
│   │   ├── stop.js
│   │   └── remove.js
│   ├── calls/
│   │   ├── index.js
│   │   ├── create.js
│   │   ├── complete.js
│   │   └── fail.js
│   ├── runtime/
│   │   ├── index.js
│   │   ├── run.js
│   │   ├── recover.js
│   │   └── errors.js
│   ├── settings/
│   │   ├── index.js
│   │   └── runtime.js
│   └── events/
│       ├── index.js
│       └── bus.js
│
└── repository/
    ├── index.js
    ├── database.js
    ├── chats.js
    ├── items.js
    ├── compactions.js
    ├── calls.js
    └── settings.js
```

## LLM

`llm/` 是 Responses API 协议适配层：

- `stream.js`：构造并发送一次模型请求，归并增量与定稿事件
- `normalize.js`：整理上行 items 并配对工具调用与结果
- `sse.js`：把响应字节流解析成 SSE JSON 事件
- `index.js`：只导出 `stream` 和 `normalize`

该层不知道 Agent 循环、bash、对话、数据库和 HTTP API。模型服务返回非成功 HTTP 状态时，响应正文原样向上抛出；正文为空时才使用状态码和状态文本。

## Agent

`agent/` 是独立的模型执行引擎，负责：

- 调用 LLM 适配层
- 执行 bash
- 继续模型工具循环
- 生成 reasoning、message、tool_calls 和 tool_results 事件

`context.js` 负责上下文组装与压缩范围计算，`compaction.js` 使用 LLM 适配层生成摘要。

Agent 只向模型提供一个 `bash` 工具。文件读取、修改、写入通过 shell 命令完成；对话间操作由上层 HTTP API 提供。不再提供独立的 read、write、edit 或 agent 工具。

### Bash 与安全

`bash.js` 负责：

- 启动 shell 子进程
- 设置工作目录和超时
- 在对话停止时终止整个进程组
- 截断过长的 stdout 和 stderr
- 将退出码、输出和错误返回模型

`safety.js` 保留为灾难命令兜底，只拦截明显会破坏整台机器的命令，例如：

- 递归删除根目录或整个用户目录
- 格式化或直接覆写块设备
- fork bomb
- 将整个根目录递归改为任何人可写

Safety 只检查命令字面，不是沙箱、权限系统或完整安全边界。正常的项目级删除、Git 操作和数据库命令不由它统一禁止。

不再保留 `lock.js`。只有 bash 时，Node 层无法可靠知道命令将读写哪些文件，按路径加进程内锁没有实际保证。并发修改应由工作区隔离、单写者策略或版本检查解决。

Agent 接收执行所需的数据和回调：

```js
runAgent({
  tools,
  input,
  instructions,
  cwd,
  signal,
  env,
  config,
  onStep,
});
```

Agent 返回本轮结果：

```js
{
  text,
  steps,
  done,
}
```

Agent 不负责：

- HTTP 请求和响应
- 读取或修改 chats、items、calls 表
- 决定谁调用谁
- 异步结果回传
- 发布 SSE
- UI 状态

`context.js` 和 `compaction.js` 不直接访问数据库。Service 从 Repository 读取数据后传入：

```js
buildContext({ items, compactions, liveResultChars });
```

```js
compact({ items, compactions, signal, context, llm, prompt });
```

## API

`api/` 负责 HTTP 协议：

- 匹配路由
- 解析参数和 JSON 请求体
- 调用 Service
- 将结果转换为 HTTP 响应
- 维护 SSE 连接

API 不直接访问 Repository，也不直接启动 Agent。

每个资源目录的 `index.js` 汇总并导出该资源的 handlers。每个 handler 文件只处理一个接口，例如：

```text
api/chats/list.js       GET    /api/chats
api/chats/create.js     POST   /api/chats
api/chats/get.js        GET    /api/chats/:id
api/chats/update.js     PATCH  /api/chats/:id
api/chats/remove.js     DELETE /api/chats/:id
api/chats/message.js    POST   /api/chats/:id/messages
api/chats/stop.js       POST   /api/chats/:id/stop
api/chats/created.js    GET    /api/chats/:id/created-chats
```

`api/index.js` 只维护总路由表，并从各资源的 `index.js` 导入 handlers。

当前 handler 保持薄层，例如消息接口：

```js
import { message } from '../../service/chats/index.js';
export const handler = ({ res, params, body, json }) =>
  json(res, message(params.id, body?.content));
```

## Service

`service/` 是业务层，连接 API、Repository、Agent 和事件系统。

### `chats/`

- 创建用户顶层对话（`origin=user`）
- 获取和列出对话
- 修改标题和描述
- 删除对话
- 写入消息
- 收到消息后自动运行对话
- 停止对话
- 按 origin 筛选用户对话与执行对话

拆分原则：

- `create.js`：只创建用户顶层对话；执行对话由 Call Service 创建
- `message.js`：写入消息并请求 Runtime 自动运行
- `stop.js`：停止当前运行
- `remove.js`：停止后删除对话
- `index.js`：导出服务方法，简单的 get、list、update 可以保留在这里

### `calls/`

- 创建异步调用
- 创建新目标对话或选择已有对话
- 新建目标对话时将 origin 设为 call
- 写入 `source=user` 的目标对话输入 item
- 立即返回 call ID 和目标 chat ID
- 目标对话完成后写回 `source=runtime` 的响应 item
- 更新 completed、cancelled 或 failed 状态
- 查询当前对话通过调用创建的目标对话列表

拆分原则：

- `create.js`：建立目标对话、请求 item 和 call
- `complete.js`：写回结果并完成 call
- `fail.js`：处理 cancelled 和 failed
- `index.js`：导出调用服务，并保留简单查询

### `runtime/`

- 保存正在运行的 AbortController
- 保证同一对话不会重复启动
- 将对话状态切换为 running 或 idle
- 从 Repository 组装执行数据
- 调用 Agent
- 处理正常完成、停止和错误
- 服务启动时将数据库中遗留的 running 状态重置为 idle

`run.js` 负责一次后台执行，`recover.js` 负责服务启动恢复，`index.js` 保存运行中的 AbortController 并暴露 run、stop 和状态查询。

Runtime 还是 item 来源分类的边界：模型定稿写为 `source=model`，bash 结果写为 `source=tool`。执行对话收到的任务属于输入侧，写为 `source=user`；执行结果回传父对话时写为 `source=runtime`。压缩记录本身保存在 `compactions`；组装模型请求时，由 Runtime 临时转换为 `role=system` 的 message 放入 input，不写入 `items`。请求错误也不写入 `items`，而是由独立的瞬时错误状态和 SSE 事件处理。

### `events/`

- 发布 SSE 事件
- 维护近期事件缓存
- 分配全局事件 ID
- 根据 Last-Event-ID 补发
- 无法完整补发时发送 gap

`bus.js` 保存事件缓存和订阅者，`index.js` 对 Service 暴露 publish 和订阅能力。

## Repository

`repository/` 只负责数据库：

- SQL
- 行数据与 JavaScript 对象之间的转换
- 必要的数据库事务

Repository 不启动 Agent、不发布事件，也不包含运行调度逻辑。

主要接口示例：

```js
chatRepository.create(data);
chatRepository.get(id);
chatRepository.list(options);
chatRepository.update(id, changes);
chatRepository.updateStatus(id, status);
chatRepository.remove(id);
```

```js
itemRepository.add(chatId, item, { source, usage });
itemRepository.listByChat(chatId, options);
```

`items.item` 始终保存标准 Responses API item。来源放在同一行独立的 `source` 字段中，允许值只有：

- `user`：输入侧消息，包括用户输入、上下文和执行任务
- `model`：模型生成的 message、reasoning 和 function_call
- `tool`：bash 产生的 function_call_output
- `runtime`：执行对话完成后写回父对话的结果

`source` 没有默认值；所有写入路径必须明确指定来源。

```js
compactionRepository.add(chatId, compaction);
compactionRepository.listByChat(chatId);
```

```js
callRepository.create(data);
callRepository.get(id);
callRepository.listByChat(chatId);
callRepository.finish(id, status, responseItemId);
```

数据库连接和 schema 初始化放在 `repository/database.js`，`repository/index.js` 只统一导出各 Repository。

SQL 只允许出现在 Repository 层。当前每个资源使用一个 Repository 文件集中准备语句、转换行数据并暴露方法，不再为单条 SQL 继续拆分文件。

## 依赖方向

```text
API
 ↓
Service
├──→ Repository
├──→ Agent
├──→ LLM（由 Agent 与压缩路径调用）
└──→ Event
```

必须保持单向依赖：

- API 只能调用 Service。
- Service 可以调用 Repository、Agent 和 Event。
- Repository 不调用其他业务层。
- Agent 不引用 API、Service 或 Repository。
- LLM 不引用 Agent、API、Service 或 Repository。
- Event 不包含对话业务逻辑。
- Agent 工具层只包含 bash；safety 只作为 bash 执行前的灾难命令兜底。

## 一次异步调用

```text
API 收到调用请求
  ↓
Call Service 创建目标对话、runtime 请求 item 和 call
  ↓
API 立即返回 call ID 与 chat ID
  ↓
Runtime Service 在后台调用 Agent
  ↓
Agent 产生模型与 bash 事件
  ↓
Runtime Service 保存 items 并发布 SSE
  ↓
Agent 本轮结束
  ↓
Call Service 把结果作为 runtime item 写回发起对话并更新 call
  ↓
Event Service 发布 input、call 和 status 事件
```

## 原则

- Agent 是执行引擎，不是对话管理器。
- Chat 是持久数据，运行只是它当前的状态。
- 进程重启后不存在仍在执行的运行，遗留的 running 状态必须恢复为 idle。
- 创建和发送消息会自动运行，不提供 start 或 resume。
- AI 可通过 bash 调用 HTTP API；AI 与 UI 共用同一套 API。
- 不提供 read、write、edit 或 agent 模型工具，也不使用文件级进程内锁。
- 数据库是最终事实，SSE 只负责增量通知。
