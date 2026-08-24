---
name: rssreader
description: RSS 阅读器 - 订阅源管理 + 文章列表 + AI 一键摘要 + 收藏。
backend: server/apps/rssreader
frontend: ui/src/apps/rssreader
database: database/apps/rssreader.db
---

# rssreader

简洁的 RSS 阅读器。订阅源、抓 feed、点文章看摘要,AI 一键 Quick Look 给出关键信息提炼。喜欢的文章可以加书签。

## 位置

- 前端:`ui/src/apps/rssreader`
- 后端:`server/apps/rssreader`
- 数据库:`database/apps/rssreader.db`

## API

- `GET  /apps/rssreader/feeds` — 列出订阅源
- `POST /apps/rssreader/feed/add` — 添加订阅源(`{ name, url }`)
- `POST /apps/rssreader/feed/remove` — 删除订阅源(`{ id }`)
- `GET  /apps/rssreader/fetch?url=...` — 抓取一条 feed 的最新文章
- `POST /apps/rssreader/summarize` — AI 摘要(`{ title, description, url, locale }`)
- `GET  /apps/rssreader/bookmarks` — 列出书签
- `POST /apps/rssreader/bookmark/add` — 添加书签(`{ feedId, title, url, summary }`)
- `POST /apps/rssreader/bookmark/remove` — 删除书签(`{ id }`)

## 数据表

- `rss_feeds(id, name, url, created_at)` — 订阅源
- `rss_bookmarks(id, feed_id, title, url, summary, created_at)` — 书签
