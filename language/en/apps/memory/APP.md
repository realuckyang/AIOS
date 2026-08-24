---
name: memory
description: Memory — manage long-term context for the AIOS AI. Active memories are merged into the system prompt. Stored in the contexts table (source='memory').
backend: server/main/api/memory
frontend: ui/src/apps/memory
database: database/aios.db (contexts where source='memory')
---

# memory

User-facing "long-term context" manager. Reuses the existing `contexts` table under the hood, but only exposes friendly fields: title / description / content / enabled / pinned.

## Locations

- Frontend: `ui/src/apps/memory`
- Backend: `server/main/api/memory/` (lives inside the main server, not a standalone app)
- Database: `database/aios.db`, rows in `contexts` where `source = 'memory'`

## API

- `GET  /api/memory/list` — All memories (pinned first, newest first)
- `GET  /api/memory/get?id=<n>` — Single memory with full content
- `POST /api/memory/create` — `{ title, description?, content, enabled?, pinned? }`
- `POST /api/memory/update` — `{ id, title?, description?, content?, enabled?, pinned? }`
- `POST /api/memory/delete` — `{ id }`

## Field mapping (memory ↔ contexts)

| memory | contexts |
|---|---|
| `id` | `id` |
| (implicit) | `source = 'memory'` |
| (implicit) | `source_id = uuid` |
| `title` | `title` |
| `description` | `summary` |
| `content` | `content` |
| `enabled` | `access` (`true → 'full'` / `false → 'none'`) |
| `pinned` | `pinned` |
| `updated_at` | `updated_at` |

A disabled memory has `access = 'none'` so the prompt service skips it — equivalent to "shelved without deleting".
