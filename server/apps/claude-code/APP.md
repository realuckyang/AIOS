---
name: claude-code
description: Claude Code 应用，把本地 claude CLI 包成 AIOS 对话式 app，并查看本机 Claude Code 的账户、历史、项目、技能、插件、MCP、计划和记忆文件。
backend: server/apps/claude-code
frontend: ui/src/apps/claude-code
database: database/apps/claude-code.db
---

# Claude Code（claude-code）

把本地安装的 `claude` CLI 包成 AIOS 应用，每个会话对应一个独立 workspace 目录，用原生聊天 UI 承载。应用也读取本机 Claude Code 资料目录，展示账户、历史、项目、技能、插件、MCP、计划和记忆文件。

## API
- `GET /apps/claude-code/status` — 检测 CLI 安装与版本
- `GET /apps/claude-code/conversations` — 会话列表
- `POST /apps/claude-code/conversations/create` — 新建会话，自动分配 workspace
- `POST /apps/claude-code/conversations/delete` — 删除
- `GET /apps/claude-code/messages?conversationId=` — 消息历史
- `POST /apps/claude-code/send` — 发送消息，返回 `application/x-ndjson` 流（每行一个事件）
- `GET /apps/claude-code/stats`
- `GET /apps/claude-code/history`
- `GET /apps/claude-code/account`
- `GET /apps/claude-code/settings`
- `POST /apps/claude-code/settings/save`
- `GET /apps/claude-code/agents`
- `GET /apps/claude-code/mcp`
- `GET /apps/claude-code/plans`
- `GET /apps/claude-code/plans/file`
- `GET /apps/claude-code/skills`
- `GET /apps/claude-code/plugins`
- `GET /apps/claude-code/projects`
- `GET /apps/claude-code/projects/dir`
- `GET /apps/claude-code/projects/file`
- `GET /apps/claude-code/memory`
- `POST /apps/claude-code/memory/save`

## 流式协议
每行 JSON：`{ "type": "event", "payload": <claude-stream-json-event> }` / `{ "type": "done" }` / `{ "type": "error", "message": "..." }`

## 数据表
- `cc_conversations(id, name, session_id, cwd, permission_mode, started, created_at, updated_at)`
- `cc_messages(id, conversation_id, role, content, meta_json, created_at)`

## 子进程调用
`claude -p --output-format stream-json --verbose --permission-mode acceptEdits [--session-id|--resume <uuid>]`，prompt 从 stdin 喂入，cwd 指向会话 workspace。

## 已知限制（MVP）
- 权限模式固定 `acceptEdits`，未接 AIOS 原生审批 UI
- 未处理 hook、MCP、subagent 等高级能力
- 未做跨 AIOS 重启的进程恢复（send 期间重启会丢失）
