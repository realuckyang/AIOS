---
name: tasks
description: 任务应用，列出后台 AI 任务（即时 / agent）的运行状态、消息流和结果，可在线终止。
backend: server/main/api/task, server/main/service/task, server/main/repository/task
frontend: ui/src/apps/tasks
database: database/aios.db (tasks)
---

# tasks

- 定位：AIOS 核心任务应用，不走 `server/apps/`，直接挂在主服务上。展示「后台 AI 任务」的列表 / 详情 / 消息流，可在线终止。
- 前端：`ui/src/apps/tasks`
- 后端：`server/main/api/task/`、`server/main/service/task/`、`server/main/repository/task/`
- 数据：`database/aios.db` 中的 `tasks`

## 数据模型

`tasks` 表（在 `database/aios.db`）：

```
id              INTEGER  自增主键
conversation_id TEXT     关联会话（可为空）
app             TEXT     发起任务的应用 id
title           TEXT     任务标题
mode            TEXT     instant | agent
prompt          TEXT     任务提示词
schema          TEXT     instant 模式的结构化输出 schema
meta            TEXT     扩展元数据（JSON 字符串）
response        TEXT     任务结果（done 时写入）
status          TEXT     pending | running | done | aborted | error
error           TEXT     失败 / 终止原因
created_at      TEXT     创建时间
finished_at     TEXT     结束时间
```

任务的 LLM 消息流另存于 `messages` 表，按 `conversation_id` 关联。

## API

| 方法 | 路径                          | 入参 / 说明 |
|------|-------------------------------|-------------|
| GET  | `/api/task`                   | 列出最近任务，按 `id DESC`，默认 limit |
| GET  | `/api/task/detail?id=`        | 单任务详情 |
| GET  | `/api/task/messages?id=`      | 单任务的消息流 |
| POST | `/api/task/create/instant`    | `{ app, title?, prompt, schema?, meta?, messages?, tools?, ... }` —— 一次性结构化任务 |
| POST | `/api/task/create/agent`      | `{ app, title?, prompt, meta?, ... }` —— 多轮 agent 任务 |
| POST | `/api/task/stop`              | `{ id }` —— 标记任务为 `aborted` |

## 在 AIOS 里的位置

- 前端在侧栏 `top` 组（与 `chat` 同组），轮询 `/api/task` 获取列表，进入详情后轮询 `/api/task/detail` 与 `/api/task/messages`
- 注册：`ui/src/apps.js`，状态在 `ui/src/stores/tasks.js`
- 任务由其它应用或核心服务通过 `createInstantTask` / `createAgentTask` 创建；本应用只读 + 终止，不直接发起任务

## 后续可扩展

按 app 过滤、按状态过滤、关键字搜索、批量终止 / 清理已完成、导出消息流。
