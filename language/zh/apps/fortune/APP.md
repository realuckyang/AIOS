---
name: fortune
description: 算一卦 - 周易摇铜钱起卦,AI 解卦给出签名 / 签诗 / 宜 / 忌 / 建议。
backend: server/apps/fortune
frontend: ui/src/apps/fortune
database: database/apps/fortune.db
---

# fortune

写下困惑,摇 6 次铜钱起出 64 卦中的一卦,AI 据卦象生成签名、四句签诗、宜做之事、忌做之事和综合建议。

## 位置

- 前端:`ui/src/apps/fortune`
- 后端:`server/apps/fortune`
- 数据库:`database/apps/fortune.db`

## API

- `POST /apps/fortune/divine` - 提交问题 + 卦象,返回解卦结果(signName / signPoem / good / bad / advice)
- `GET /apps/fortune/list?page=1&pageSize=10` - 分页获取历史卦象

## 数据表

- `fortune_records(question, sign_name, sign_poem, good, bad, advice, hexagram, created_at)` - 每次起卦插一行
