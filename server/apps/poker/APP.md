---
name: poker
description: 炸金花 - AI 与用户对战的图形化炸金花牌局，支持下注、跟注、比牌。数据在 poker_games。
backend: apps/poker
database: database/apps/poker.db
---

# 炸金花

经典三张牌炸金花，用户 vs AI 对战。

API:
- `POST /apps/poker/start` - 开始新一局
- `POST /apps/poker/action` - 玩家操作（bet/fold/compare）
- `GET /apps/poker/state?id=xxx` - 获取当前牌局状态
- `GET /apps/poker/list?page=1&pageSize=10` - 历史记录
