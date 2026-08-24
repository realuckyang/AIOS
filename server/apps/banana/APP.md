---
name: banana
description: 老手机 - AI 驱动的复古手机模拟器。用户选择选项，AI 生成新的 HTML 界面。数据在 banana_sessions。
backend: apps/banana
database: database/apps/banana.db
---

# 老手机

复古手机互动游戏，AI 根据用户选择动态生成手机界面。

## API
- `GET /apps/banana/progress` - 获取最近一次游戏进度
- `POST /apps/banana/generation` - 生成新界面（参数：history, now, choices, next）

## 数据表
- `banana_sessions` - 游戏会话记录（current_screen, screen_history, battery_level）
