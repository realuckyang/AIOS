---
name: fortune
description: I Ching reading. The user shakes coins to cast one of 64 hexagrams; AI interprets it.
backend: server/apps/fortune
frontend: ui/src/apps/fortune
database: database/apps/fortune.db
---

# fortune

Write your question, shake the coins six times to cast one of the 64 hexagrams. AI then generates a sign name, a four-line poem, what to do, what to avoid, and a balanced advice paragraph.

## Locations

- Frontend: `ui/src/apps/fortune`
- Backend: `server/apps/fortune`
- Database: `database/apps/fortune.db`

## API

- `POST /apps/fortune/divine` - Submit question + hexagram, returns signName / signPoem / good / bad / advice
- `GET /apps/fortune/list?page=1&pageSize=10` - Paginated history

## Tables

- `fortune_records(question, sign_name, sign_poem, good, bad, advice, hexagram, created_at)` - One row per cast
