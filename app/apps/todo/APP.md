---
name: todo
description: 本机待办清单。agent 经 /api/todos 同样可读写。
backend: app/apps/todo/server
database: var/apps/todo.db
---

# 待办

## API
- `GET /api/todos` · `POST /api/todos` · `PATCH /api/todos/<id>` · `DELETE /api/todos/<id>`
- `DELETE /api/todos/done` 清掉已完成

## 数据表
- `todos` — id · title · done · created_at · updated_at
