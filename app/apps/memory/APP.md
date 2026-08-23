---
name: memory
description: agent 与人类共用的持久事实库。agent 把环境盘点、结论、约定沉淀到这里。
backend: app/apps/memory/server
database: var/apps/memory.db
---

# 记忆

## API
- `GET /api/memories`(可带 ?tag=) · `POST` · `GET/PATCH/DELETE /api/memories/<id>`
- `GET /api/memories/tags` 按主题聚合

## 数据表
- `memories` — id · title · body · tags(JSON 数组) · pinned · source
