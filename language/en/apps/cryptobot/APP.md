---
name: cryptobot
description: CryptoBot app for exchange setup, market/position/order views, and periodic local trading-agent runs.
backend: server/apps/cryptobot
frontend: ui/src/apps/cryptobot
database: database/apps/cryptobot.db
---

# cryptobot

Crypto trading bot app for exchange connectivity, market/position views, and local trading-agent runs.

## Location

- Frontend: `ui/src/apps/cryptobot`
- Backend: `server/apps/cryptobot`
- Database: `database/apps/cryptobot.db`

## Notes

This app has its own backend and runtime. The backend owns configuration, market data, positions, decisions, and trading execution; the frontend displays market data, runtime status, positions, and decision logs.
