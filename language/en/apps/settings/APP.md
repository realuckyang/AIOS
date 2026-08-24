---
name: settings
description: System settings app for account, model, instructions, messages, tools, and about information.
backend: server/main/api/settings, server/main/service/settings, server/main/repository/settings
frontend: ui/src/apps/settings
database: database/aios.db (settings)
---

# settings

- Role: a core AIOS settings app. It does not go through `server/apps/`; it is mounted directly on the main service.
- Frontend: `ui/src/apps/settings`
- Backend: `server/main/api/settings/`, `server/main/service/settings/`, `server/main/repository/settings/`
- Data: `settings` in `database/aios.db`
- Tabs: Account, Model, Instructions, Messages, Tools, About
- Entry points:
  - `GET /api/settings`
  - `POST /api/settings`
  - `GET /api/settings/prompt`
  - `POST /api/settings/prompt`
