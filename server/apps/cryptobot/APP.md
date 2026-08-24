---
name: cryptobot
description: 炒币机 - 基于 OKX 的自主交易应用。用户仅配置凭证与目标，系统周期性触发 AI 自主执行并记录任务总结。数据在 cryptobot_config、cryptobot_state、cryptobot_decisions、cryptobot_equity。
backend: server/apps/cryptobot
database: database/apps/cryptobot.db
---

# 炒币机

周期性触发 AI 任务，AI 基于目标完全自主决策与执行。  
Decision Log 只记录每轮任务总结，不记录固定 action/amount 字段。

API:
- GET `/apps/cryptobot/agent`
- POST `/apps/cryptobot/agent`
- POST `/apps/cryptobot/agent/exchange/test`
- POST `/apps/cryptobot/agent/start`
- POST `/apps/cryptobot/agent/stop`
- GET `/apps/cryptobot/decision/records?limit=50`
- GET `/apps/cryptobot/trade/orders?instType=ANY&limit=50`
- GET `/apps/cryptobot/positions`
- GET `/apps/cryptobot/market`
