---
name: cryptobot
description: 炒币机应用，用于配置交易所、查看行情/仓位/订单，并周期性运行本地交易 Agent。
backend: server/apps/cryptobot
frontend: ui/src/apps/cryptobot
database: database/apps/cryptobot.db
---

# cryptobot

炒币机应用，用于连接交易所、查看行情/仓位，并运行本地交易 Agent。

## 位置

- 前端：`ui/src/apps/cryptobot`
- 后端：`server/apps/cryptobot`
- 数据库：`database/apps/cryptobot.db`

## 说明

这是有专属后端和运行时的应用。后端负责配置、行情、仓位、决策记录和交易执行；前端负责展示行情、运行状态、仓位和决策日志。
