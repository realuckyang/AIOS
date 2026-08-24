---
name: debate
description: 竞选模拟器 - 总统竞选辩论训练应用，支持多议题回合制辩论、总结与结算。
---

# 竞选模拟器

用户选择党派和候选人后，进入回合制电视辩论，目标是最终支持率超过 50%。

## API
- `POST /apps/debate/parties` - 获取党派列表
- `POST /apps/debate/start` - 开始辩论（生成议题和开场）
- `POST /apps/debate/debate` - 回合推进（主持人/对手/候选人/下一议题）
- `POST /apps/debate/summary` - 议题总结与支持率更新
- `POST /apps/debate/continue` - 下一议题开场
- `POST /apps/debate/finish` - 结束并生成胜利演讲/失败分析
- `POST /apps/debate/save` - 保存发言记录

## 数据表
- `apps_debate_parties`
- `apps_debate_sessions`
- `apps_debate_records`
