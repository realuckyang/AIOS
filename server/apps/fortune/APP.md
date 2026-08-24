---
name: fortune
description: 算一卦 - 玄学转盘，用户输入问题后转盘抽签，AI 给出宜忌建议。数据在 fortune_records。
backend: apps/fortune
database: database/apps/fortune.db
---

# 算一卦

用户输入困惑或问题，转盘旋转抽签，AI 根据签文生成宜/忌建议。

API:
- `POST /apps/fortune/divine` - 提交问题，获取卦象结果
- `GET /apps/fortune/list?page=1&pageSize=10` - 历史记录
