---
name: lovehouse
description: Virtual Companion — every AI reply ships with the character's inner thought
backend: server/apps/lovehouse
frontend: ui/src/apps/lovehouse
database: database/apps/lovehouse.db
---

# lovehouse — Virtual Companion Chat

A chat app for talking with a virtual companion. **Signature feature**: every AI reply contains two layers ——

- **thought**: the character's inner monologue (visible to the user, but the character "thinks" it's just thinking)
- **reply**: what the character actually says out loud

Plus an optional short mood tag.

## Locations

- Frontend: `ui/src/apps/lovehouse`
- Backend: `server/apps/lovehouse`
- Database: `database/apps/lovehouse.db`

## Visuals

- Material 3 chat layout. Pink-gradient bubbles for user, soft-grey bubbles for AI
- Inner thought renders above the AI bubble: italic, smaller, with a pink dashed left border and a brain icon
- Mood appears as a pink chip pinned to the end of the AI bubble

## API

- `GET  /apps/lovehouse/messages?limit=200` — message history (includes thought / mood)
- `POST /apps/lovehouse/chat` — send `{content}`, returns `{reply, thought, mood}`

## AI

Chat core flows through the AIOS task system (`instantTaskJson`), sharing model / token config with all other apps.
The LLM emits strict JSON of the form: `{thought, reply, mood?}`.

## Tables

- `apps_lovehouse_messages(role, content, thought, mood, created_at)`
