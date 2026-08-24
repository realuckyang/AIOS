---
name: hackernews
description: Hacker News 阅读器 - 浏览 HN 热门/最新/精选榜单,看故事详情和评论树,AI 摘要单篇文章或一键生成整页速读。支持收藏。数据在 hackernews_bookmarks。
backend: server/apps/hackernews
frontend: ui/src/apps/hackernews
database: database/apps/hackernews.db
---

# Hacker News

YC 风格的 HN 阅读器。功能形态对标 ghtrending —— 内容浏览 + AI 分析,不做订阅推送。

- 三个榜单切换:Top / New / Best,从 `hacker-news.firebaseio.com` 公共 API 拉
- 顶部 banner 一键 "✦ 生成摘要" → AI 总结当前榜单的核心动态(inline 渲染)
- 故事行列表(序号 + 标题 + 分数/作者/评论数/域名),hover 显示收藏 ☆
- 进入详情:文章头 + 原文链接 + AI 单篇摘要按钮 + 顶层评论树(深度 2)
- ★ 收藏页:看历史收藏的故事,可点击进详情

## API

- `GET  /apps/hackernews/list?type=top|new|best`
- `GET  /apps/hackernews/detail?id=`
- `POST /apps/hackernews/summarize` (title, url|text, locale)
- `GET  /apps/hackernews/bookmarks`
- `POST /apps/hackernews/bookmark`
- `POST /apps/hackernews/unbookmark`

## 设计语言

- YC 经典 #f60 橘黄 + #f6f5ef 米色,Georgia 衬线
- AIOS 标准顶栏(`.app-frame` + `.topbar` + `AppsTrigger`/`ChatTrigger`),下方挂一条 HN 橘色子导航(榜单 tabs + ★ 收藏)
- 详情页隐藏橘色子栏(返回列表按钮在内容区顶部),专注阅读
