---
name: tasks
description: Tasks app — lists background AI tasks (instant / agent) with status, message stream, and result. Supports stop.
backend: server/main/api/task, server/main/service/task, server/main/repository/task
frontend: ui/src/apps/tasks
database: database/aios.db (tasks)
---

# tasks

- Role: AIOS's core tasks app. It does not go through `server/apps/`; it is mounted directly on the main service. Shows the list / detail / message stream of "background AI tasks" and lets you stop a running one.
- Frontend: `ui/src/apps/tasks`
- Backend: `server/main/api/task/`, `server/main/service/task/`, `server/main/repository/task/`
- Data: `tasks` in `database/aios.db`

## Data model

`tasks` table (in `database/aios.db`):

```
id              INTEGER  auto-increment primary key
conversation_id TEXT     linked conversation (nullable)
app             TEXT     id of the app that created the task
title           TEXT     task title
mode            TEXT     instant | agent
prompt          TEXT     task prompt
schema          TEXT     structured-output schema (instant mode)
meta            TEXT     extra metadata (JSON string)
response        TEXT     task result (written on done)
status          TEXT     pending | running | done | aborted | error
error           TEXT     failure / abort reason
created_at      TEXT     created time
finished_at     TEXT     finished time
```

The task's LLM message stream lives in the `messages` table, linked by `conversation_id`.

## API

| Method | Path                          | Body / Notes |
|--------|-------------------------------|--------------|
| GET    | `/api/task`                   | List recent tasks, ordered by `id DESC` with a default limit |
| GET    | `/api/task/detail?id=`        | Single task detail |
| GET    | `/api/task/messages?id=`      | Message stream of a single task |
| POST   | `/api/task/create/instant`    | `{ app, title?, prompt, schema?, meta?, messages?, tools?, ... }` — one-shot structured task |
| POST   | `/api/task/create/agent`      | `{ app, title?, prompt, meta?, ... }` — multi-turn agent task |
| POST   | `/api/task/stop`              | `{ id }` — mark a task as `aborted` |

## Where it lives in AIOS

- Frontend sits in the rail's `top` group (same group as `chat`). It polls `/api/task` for the list, and once a task is opened, polls `/api/task/detail` and `/api/task/messages`.
- Registration: `ui/src/apps.js`; state lives in `ui/src/stores/tasks.js`
- Tasks are created by other apps or by core services via `createInstantTask` / `createAgentTask`. This app only reads and stops — it does not start tasks itself.

## Future extensions

Filter by app, filter by status, keyword search, bulk stop / cleanup of finished tasks, export message stream.
