---
name: terminal
description: 终端应用，通过 WebSocket 管理本地 shell 会话，支持创建、切换、输入、调整尺寸和关闭终端。
backend: server/apps/terminal
frontend: ui/src/apps/terminal
database: none
---

# terminal

终端应用。后端维护本地 shell 会话，前端提供输入、输出、标签页和底部工具面板。

## 位置

- 前端：`ui/src/apps/terminal`
- 后端：`server/apps/terminal`
- 数据库：无

## WebSocket 协议

- `terminal.list`：列出终端
- `terminal.create`：新建终端
- `terminal.activate`：切换活动终端
- `terminal.close`：关闭终端
- `data.input`：发送输入
- `system.resize`：调整终端尺寸
- `system.command`：执行内置系统命令

后端会推送 `terminal.list`、`terminal.created`、`terminal.closed`、`terminal.activated`、`system.init`、`data.output`、`terminal.error`。
