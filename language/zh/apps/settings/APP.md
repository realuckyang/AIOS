---
name: settings
description: 系统设置应用，负责账户、模型、指令、消息、工具和关于信息。
backend: server/main/api/settings, server/main/service/settings, server/main/repository/settings
frontend: ui/src/apps/settings
database: database/aios.db (settings)
---

# settings

- 定位：AIOS 核心设置应用，不走 `server/apps/`，直接挂在主服务上。
- 前端：`ui/src/apps/settings`
- 后端：`server/main/api/settings/`、`server/main/service/settings/`、`server/main/repository/settings/`
- 数据：`database/aios.db` 中的 `settings`
- 页签：账户、模型、指令、消息、工具、关于
- 入口：
  - `GET /api/settings`
  - `POST /api/settings`
  - `GET /api/settings/prompt`
  - `POST /api/settings/prompt`
