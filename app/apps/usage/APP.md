---
name: usage
description: 用量与成本。第一方应用:只读框架的记账数据,不建自己的库。
backend: (无服务端 —— 读框架的 /api/usage)
database: (无 —— 数据在框架库 var/aios.db)
---

# 用量趋势

第一方应用。它读的是框架自己的记账事实,所以不走 `_shared/db.js`,
也不该直连框架库 —— 一律经 `GET /api/usage/*`。

**第一个例外一旦开,规矩就没了**:老 AIOS 的主库最后混进了 notes 和 cc_events,
就是从「这个应用特殊一点」开始的。

## 用到的 API
- `GET /api/usage` 总览 · `GET /api/usage/trend` 时间趋势
- `GET /api/usage/threads` 按线程(对话与任务同列)
- `GET /api/usage/models` 按模型
