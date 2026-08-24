---
name: claude-code
description: Claude Code app that wraps the local claude CLI in an AIOS chat interface.
backend: server/apps/claude-code
frontend: ui/src/apps/claude-code
database: database/apps/claude-code.db
---

# claude-code

- Role: runs local Claude Code sessions through the AIOS app shell, and surfaces local Claude Code account, history, projects, skills, plugins, MCP, plans, and memory files.
- Frontend: `ui/src/apps/claude-code`
- Backend: `server/apps/claude-code`
- Data: `database/apps/claude-code.db`
- Runtime dependency: local `claude` CLI.
- Workspace: each conversation has its own working directory.
- Entry points:
  - `GET /apps/claude-code/status`
  - `GET /apps/claude-code/conversations`
  - `POST /apps/claude-code/conversations/create`
  - `POST /apps/claude-code/conversations/delete`
  - `GET /apps/claude-code/messages`
  - `POST /apps/claude-code/send`
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
