---
name: rssreader
description: RSS reader — subscribe feeds, list entries, AI Quick Look summary, bookmarks.
backend: server/apps/rssreader
frontend: ui/src/apps/rssreader
database: database/apps/rssreader.db
---

# rssreader

Minimal RSS reader. Manage feeds, fetch entries, AI Quick Look produces a concise summary on demand. Bookmark anything worth keeping.

## Locations

- Frontend: `ui/src/apps/rssreader`
- Backend: `server/apps/rssreader`
- Database: `database/apps/rssreader.db`

## API

- `GET  /apps/rssreader/feeds` — List feeds
- `POST /apps/rssreader/feed/add` — Add feed (`{ name, url }`)
- `POST /apps/rssreader/feed/remove` — Remove feed (`{ id }`)
- `GET  /apps/rssreader/fetch?url=...` — Fetch latest entries of a feed
- `POST /apps/rssreader/summarize` — AI summarize (`{ title, description, url, locale }`)
- `GET  /apps/rssreader/bookmarks` — List bookmarks
- `POST /apps/rssreader/bookmark/add` — Add bookmark (`{ feedId, title, url, summary }`)
- `POST /apps/rssreader/bookmark/remove` — Remove bookmark (`{ id }`)

## Tables

- `rss_feeds(id, name, url, created_at)` — Feeds
- `rss_bookmarks(id, feed_id, title, url, summary, created_at)` — Bookmarks
