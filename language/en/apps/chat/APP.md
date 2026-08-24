---
name: chat
description: Chat app with multi-session support, WebSocket streaming replies, tool calls, and attachment upload.
backend: server/main/api/chat, server/main/service/chat, server/main/ai, server/main/llm, server/main/service/prompt
frontend: ui/src/apps/chat
database: database/aios.db (chats, messages)
---

# chat

- Role: the system's core chat app. It does not go through `server/apps/`; it is mounted directly on the main service.
- Frontend: `ui/src/apps/chat`
- Backend: `server/main/api/chat/`, `server/main/service/chat/`, `server/main/ai/`, `server/main/llm/`, `server/main/service/prompt/`
- Data: `chats` and `messages` in `database/aios.db`
- Entry points:
  - HTTP: `/api/chat/*`
  - WebSocket: streaming chat session
  - Protocol: `ui/src/apps/chat/protocol.js`
- Attachments: `/api/fs/upload`, stored under `files/uploads/chat`
