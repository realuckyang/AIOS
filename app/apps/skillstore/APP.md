---
name: skillstore
description: 代理讯飞 skillhub 公开 API 供浏览,并把技能包装进本地 skills/。
backend: app/apps/skillstore/server
database: (无 —— 装到 skills/ 目录)
---

# 技能商店

## API
- `GET /api/skills-store/list|skill|installed` · `POST /api/skills-store/install|uninstall`
