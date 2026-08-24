---
name: lovehouse
description: 虚拟伴侣 - 每条 AI 回复同时附带角色的内心想法
backend: server/apps/lovehouse
frontend: ui/src/apps/lovehouse
database: database/apps/lovehouse.db
---

# lovehouse — 虚拟伴侣聊天

和虚拟伴侣聊天的小应用。**核心特色**: AI 每次回应都同时输出两层内容 ——

- **thought**: 角色此刻的内心独白 (用户能看到, 但角色"以为"自己只是想想)
- **reply**: 角色实际说出口的话

可选附带一个简短的情绪标签 (mood)。

## 位置

- 前端: `ui/src/apps/lovehouse`
- 后端: `server/apps/lovehouse`
- 数据库: `database/apps/lovehouse.db`

## 视觉

- Material 3 聊天界面, 用户粉色渐变气泡 / AI 浅灰气泡
- 内心想法显示在 AI 气泡之上, 斜体小字 + 粉色虚线左边框 + 大脑图标
- 情绪标签作为粉色 chip 嵌在气泡末尾

## API

- `GET  /apps/lovehouse/messages?limit=200` — 历史消息 (含 thought / mood)
- `POST /apps/lovehouse/chat` — 发消息 `{content}`, 返回 `{reply, thought, mood}`

## AI

对话核心走 AIOS 任务系统 (`instantTaskJson`), 与其他 app 共享模型/Token 配置。
LLM 严格 JSON 输出, schema: `{thought, reply, mood?}`。

## 数据表

- `apps_lovehouse_messages(role, content, thought, mood, created_at)`
