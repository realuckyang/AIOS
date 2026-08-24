---
name: subbox
description: 订阅箱 - 用户配置一份每日订阅(主题 + 时间),后台 ticker 到点触发 AI agent 任务,生成早报式总结。单行配置 subbox_config + 历史 subbox_reports。
backend: server/apps/subbox
frontend: ui/src/apps/subbox
database: database/apps/subbox.db
---

# 订阅箱

每日定时让 AI 帮用户拉一份早报。功能形态:**一份订阅 + 它的早报历史**(不是多订阅 CRUD)。

- 用户用一句话描述"想订阅什么"(自然语言主题)+ 每日触发时间(HH:MM,本地时区)+ 是否启用
- 后台 ticker 每 30s 扫一次,enabled 且 topic 非空且到点且今日未跑 → 异步触发 `agentTask`,不阻塞 ticker
- 防重入: 内存 executing flag + 数据库 `last_run_date` 双重保护
- 配置首次填入 topic 时,`last_run_date` 设为今天,避免老时间立即触发;次日开始按时派送

## 位置

- 前端: `ui/src/apps/subbox`
- 后端: `server/apps/subbox`
- 数据库: `database/apps/subbox.db`

## API

- `GET /apps/subbox/config`
- `POST /apps/subbox/config`(部分字段更新)
- `POST /apps/subbox/run-now`
- `GET /apps/subbox/reports?limit=`
- `POST /apps/subbox/reports/clear`
