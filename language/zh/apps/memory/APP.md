---
name: memory
description: 记忆 - 让用户管理 AI 的"长期记忆"。启用的记忆会拼进主 AI 的 system prompt。底层数据写到 contexts 表 (source='memory')。
backend: server/main/api/memory
frontend: ui/src/apps/memory
database: database/aios.db (contexts where source='memory')
---

# memory

记忆是用户视角的「长期上下文」。底层复用 `contexts` 表,但只暴露 user-friendly 的 title / description / content / enabled / pinned 字段。

## 位置

- 前端:`ui/src/apps/memory`
- 后端:`server/main/api/memory/`(主进程,跟着 main server 一起跑,不是独立 app)
- 数据库:`database/aios.db` 里 `contexts` 表中 `source = 'memory'` 的行

## API

- `GET  /api/memory/list` - 列出所有记忆(置顶在前,新到旧)
- `GET  /api/memory/get?id=<n>` - 单条详情(含 content 全文)
- `POST /api/memory/create` - 创建(`{ title, description?, content, enabled?, pinned? }`)
- `POST /api/memory/update` - 修改(`{ id, title?, description?, content?, enabled?, pinned? }`)
- `POST /api/memory/delete` - 删除(`{ id }`)

## 字段映射(memory ↔ contexts)

| memory | contexts |
|---|---|
| `id` | `id` |
| (隐含) | `source = 'memory'` |
| (隐含) | `source_id = uuid` |
| `title` | `title` |
| `description` | `summary` |
| `content` | `content` |
| `enabled` | `access`(`true → 'full'` / `false → 'none'`)|
| `pinned` | `pinned` |
| `updated_at` | `updated_at` |

`enabled = false` 的记忆 access 落到 `'none'`,主 AI 拼 system prompt 时会被跳过 —— 等于"暂存不删"。
