---
name: workshop
description: Workshop app that starts from a topic, generates multiple UI directions, and asynchronously produces previewable single-file HTML demos.
backend: server/apps/workshop
frontend: ui/src/apps/workshop
database: database/apps/workshop.db
---

# workshop

Workshop. From a single topic, AI generates N distinct UI design directions in parallel, each producing a complete previewable single-file HTML demo.

Data model: projects → plans (N design directions) → tasks (one execution per attempt) → results (HTML artifacts).

Main flows:

- List view: textarea for the topic, +/- to pick N (1–6), click "create project". Expand the "Ideas" panel to seed from a preset prompt.
- Project view: each plan shows a status badge (pending/running/done/failed), done plans open the preview, failed or done plans can be regenerated.
- Plan view: iframe sandbox (allow-scripts/forms/modals/popups, no same-origin) renders the AI-generated single-file HTML directly.

API:

- `GET  /apps/workshop/ideas` — preset idea templates
- `GET  /apps/workshop/project/list` — all projects with status counts
- `GET  /apps/workshop/project/get?id=` — project detail (plans + latest task per plan)
- `POST /apps/workshop/project/create` — body `{ topic, count, ideaId? }`, plans sync, HTML async
- `POST /apps/workshop/project/delete` — body `{ id }`
- `POST /apps/workshop/plan/regenerate` — body `{ planId }`, opens a new task
- `GET  /apps/workshop/result/get?planId=&taskId=` — fetch HTML (latest done for plan, specific for task)
