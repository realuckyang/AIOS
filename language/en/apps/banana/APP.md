---
name: banana
description: Old-phone simulator. The user picks a choice, AI generates the next HTML screen.
backend: server/apps/banana
frontend: ui/src/apps/banana
database: database/apps/banana.db
---

# banana

Retro phone interactive game. AI dynamically generates the next screen's HTML and choices based on user selection — branching forever.

## Locations

- Frontend: `ui/src/apps/banana`
- Backend: `server/apps/banana`
- Database: `database/apps/banana.db`

## API

- `GET /apps/banana/progress` - Latest session for resume on boot
- `POST /apps/banana/generation` - Generate next screen (params: history / now / choices / next)

## Tables

- `banana_sessions(current_screen, screen_history, battery_level, created_at)` - One row per generated screen. On boot the `progress` endpoint reads the latest row to resume state.
