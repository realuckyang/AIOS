---
name: workshop
description: 工坊应用，从一个主题出发生成多个 UI 设计方向，并异步产出可预览的单文件 HTML demo。
backend: server/apps/workshop
frontend: ui/src/apps/workshop
database: database/apps/workshop.db
---

# workshop

工坊(workshop)。从一个主题出发,AI 同时生成 N 个风格各异的 UI 设计方向,并各自生成一个完整可预览的 HTML demo。

数据模型:projects(项目) → plans(N 个设计方向) → tasks(每次生成的执行) → results(HTML 产物)。

主要交互:

- 列表页:textarea 输入主题,加减选择 N(1–6),点"创建项目"。可展开"灵感库"挑预置主题当起点。
- 项目详情:每个 plan 展示状态徽章(排队中/生成中/已完成/失败),已完成可点开预览,失败或完成都可点"再生成"
- 预览页:iframe 沙箱(allow-scripts/forms/modals/popups,无 same-origin)直接渲染 AI 生成的单文件 HTML

API:

- `GET  /apps/workshop/ideas` — 灵感模板列表
- `GET  /apps/workshop/project/list` — 所有项目(含状态计数)
- `GET  /apps/workshop/project/get?id=` — 项目详情(plans + 每个 plan 最新 task)
- `POST /apps/workshop/project/create` — body `{ topic, count, ideaId? }`,同步生成方向,异步跑 HTML
- `POST /apps/workshop/project/delete` — body `{ id }`
- `POST /apps/workshop/plan/regenerate` — body `{ planId }`,新开一个 task
- `GET  /apps/workshop/result/get?planId=&taskId=` — 取 HTML(给 plan 取最新成功,给 task 取这一次)
