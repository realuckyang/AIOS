---
name: banana
description: 老手机 - AI 驱动的复古手机模拟器。用户选择选项,AI 生成新的 HTML 界面。
backend: server/apps/banana
frontend: ui/src/apps/banana
database: database/apps/banana.db
---

# banana

复古手机互动游戏。AI 根据用户选择动态生成下一屏 HTML 界面与可选项,用户继续选,无限分支。

## 位置

- 前端:`ui/src/apps/banana`
- 后端:`server/apps/banana`
- 数据库:`database/apps/banana.db`

## API

- `GET /apps/banana/progress` - 获取最近一次游戏进度(用于断点恢复)
- `POST /apps/banana/generation` - 生成下一屏(参数:history / now / choices / next)

## 数据表

- `banana_sessions(current_screen, screen_history, battery_level, created_at)` - 每生成一屏插一行,首次启动时 `progress` 端会读最新一行恢复进度
