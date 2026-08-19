# AIOS App 历史盘点

生成日期：2026-07-07

本文档从 Git 全历史中盘点 AIOS 曾经出现过的应用。统计口径以应用级证据为准：出现过 `APP.md`、后端入口、前端入口，或当前 `ui/src/apps.js` 注册记录的条目，计入正式 app。仅出现过旧版视图文件、没有应用文档或前后端入口的条目，单独列为候选。

## 统计摘要

- 正式出现过的 app：61 个
- 当前应用面板注册的 app：24 个
- 历史出现但当前未注册的 app：37 个
- 仅旧视图残留的候选：3 个

## 证据说明

- `doc`：出现过 `APP.md`
- `backend`：出现过后端入口，如 `server/apps/<id>/index.js` 或旧 `apps/<id>/index.js`
- `frontend`：出现过前端入口，如 `ui/src/apps/<id>/index.vue`
- `component`：出现过旧组件目录，如 `ui/src/components/apps/<id>/`
- `view`：出现过旧视图文件，如 `ui/src/views/apps/<Name>View.vue`

## 当前注册的 App

| App ID | 当前显示名 | 首次出现 | 最近出现 | 证据 |
|---|---|---:|---:|---|
| `chat` | 对话 | 2026-03-19 | 2026-06-17 | doc + frontend |
| `tasks` | 任务 | 2026-03-19 | 2026-06-17 | doc + frontend |
| `notebook` | 笔记本 | 2026-02-27 | 2026-06-17 | backend + component + doc + frontend + view |
| `finance` | 记账本 | 2026-02-27 | 2026-06-17 | backend + component + doc + frontend + view |
| `terminal` | 终端 | 2026-05-05 | 2026-06-17 | backend + doc + frontend |
| `files` | 文件 | 2026-02-27 | 2026-06-17 | backend + doc + frontend + view |
| `claude-code` | Claude Code | 2026-04-22 | 2026-06-17 | backend + doc + frontend |
| `sysinfo` | 系统状态 | 2026-05-05 | 2026-06-17 | backend + doc + frontend |
| `subbox` | 订阅箱 | 2026-05-07 | 2026-06-17 | backend + doc + frontend |
| `banana` | 老手机 | 2026-03-12 | 2026-06-17 | backend + component + doc + frontend |
| `fortune` | 算一卦 | 2026-03-04 | 2026-06-17 | backend + component + doc + frontend + view |
| `ghtrending` | GH 热榜 | 2026-04-03 | 2026-06-17 | backend + doc + frontend |
| `rssreader` | RSS 阅读 | 2026-04-03 | 2026-06-17 | backend + doc + frontend |
| `memory` | 记忆 | 2026-04-25 | 2026-06-17 | doc + frontend |
| `lovehouse` | 虚拟伴侣 | 2026-02-28 | 2026-06-17 | backend + doc + frontend + view |
| `hackernews` | Hacker News | 2026-04-03 | 2026-06-17 | backend + doc + frontend |
| `poker` | 炸金花 | 2026-03-04 | 2026-06-17 | backend + component + doc + frontend + view |
| `treasure` | 藏宝阁 | 2026-02-28 | 2026-06-17 | backend + doc + frontend + view |
| `debate` | 辩论台 | 2026-02-28 | 2026-06-17 | backend + doc + frontend + view |
| `earth` | 地球 | 2026-05-07 | 2026-06-17 | backend + frontend |
| `civ` | 文明 | 2026-05-07 | 2026-06-17 | backend + frontend |
| `cryptobot` | 炒币机 | 2026-03-02 | 2026-06-17 | backend + component + doc + frontend + view |
| `workshop` | 工坊 | 2026-05-05 | 2026-06-17 | backend + doc + frontend |
| `settings` | 设置 | 2026-03-19 | 2026-06-17 | doc + frontend |

## 历史出现但当前未注册的 App

| App ID | 首次出现 | 最近出现 | 证据 |
|---|---:|---:|---|
| `beach` | 2026-03-06 | 2026-03-09 | backend + view |
| `blackroom` | 2026-03-02 | 2026-03-09 | backend + doc + view |
| `briefing` | 2026-03-02 | 2026-03-10 | backend + doc + view |
| `codex` | 2026-04-22 | 2026-06-02 | backend + doc |
| `coinmarket` | 2026-04-03 | 2026-04-03 | backend + frontend |
| `createapp` | 2026-03-01 | 2026-05-01 | backend + component + doc + frontend + view |
| `dailycheck` | 2026-03-02 | 2026-03-09 | backend + doc + view |
| `demo` | 2026-05-02 | 2026-05-05 | backend |
| `demogen` | 2026-05-26 | 2026-06-02 | backend + doc |
| `doodle` | 2026-03-04 | 2026-03-05 | backend + doc + view |
| `earthquake` | 2026-04-03 | 2026-05-07 | backend + doc + frontend |
| `inbox` | 2026-02-28 | 2026-03-10 | backend + doc + view |
| `ledger` | 2026-06-04 | 2026-06-17 | backend + doc + frontend |
| `lifeguide` | 2026-03-02 | 2026-03-02 | backend + doc + view |
| `longvideo` | 2026-05-25 | 2026-06-02 | backend + doc |
| `mindtree` | 2026-02-28 | 2026-03-04 | backend + component + doc |
| `monitors` | 2026-05-26 | 2026-06-04 | doc |
| `nokia` | 2026-02-28 | 2026-03-12 | backend + component + doc + view |
| `notepad` | 2026-06-04 | 2026-06-17 | backend + doc + frontend |
| `notes` | 2026-05-11 | 2026-06-17 | backend + frontend |
| `openclaw` | 2026-03-20 | 2026-04-01 | backend + doc + frontend |
| `outline` | 2026-02-27 | 2026-02-28 | backend + component + doc + view |
| `playground` | 2026-02-28 | 2026-03-09 | backend + doc + view |
| `producthunt` | 2026-04-03 | 2026-04-03 | backend + frontend |
| `reader` | 2026-03-10 | 2026-04-03 | backend + component + doc + frontend + view |
| `redmill` | 2026-03-04 | 2026-03-05 | backend + doc + view |
| `skills` | 2026-03-19 | 2026-04-09 | doc + frontend |
| `smartlist` | 2026-02-27 | 2026-02-28 | backend + doc + view |
| `store` | 2026-05-01 | 2026-05-05 | doc |
| `story` | 2026-03-02 | 2026-03-10 | backend + doc + view |
| `subscriber` | 2026-03-10 | 2026-04-03 | backend + component + doc + frontend + view |
| `todo` | 2026-05-01 | 2026-06-17 | backend + doc + frontend |
| `triggers` | 2026-05-25 | 2026-05-25 | doc |
| `weather` | 2026-04-03 | 2026-04-07 | backend + frontend |
| `weibo` | 2026-03-05 | 2026-03-09 | backend + view |
| `wikitree` | 2026-04-03 | 2026-04-03 | backend + frontend |
| `writerpad` | 2026-02-28 | 2026-03-10 | backend + component + doc + view |

## 仅旧视图残留的候选

这些条目在历史中出现过旧版视图文件，但没有发现 `APP.md`、前端 app 入口或后端 app 入口。它们不计入 61 个正式 app。

| App ID | 首次出现 | 最近出现 | 证据 |
|---|---:|---:|---|
| `outliner` | 2026-02-28 | 2026-03-04 | view |
| `schedule` | 2026-03-07 | 2026-03-09 | view |
| `schedule-create` | 2026-03-07 | 2026-03-09 | view |

## 全量正式 App ID

`banana`, `beach`, `blackroom`, `briefing`, `chat`, `civ`, `claude-code`, `codex`, `coinmarket`, `createapp`, `cryptobot`, `dailycheck`, `debate`, `demo`, `demogen`, `doodle`, `earth`, `earthquake`, `files`, `finance`, `fortune`, `ghtrending`, `hackernews`, `inbox`, `ledger`, `lifeguide`, `longvideo`, `lovehouse`, `memory`, `mindtree`, `monitors`, `nokia`, `notebook`, `notepad`, `notes`, `openclaw`, `outline`, `playground`, `poker`, `producthunt`, `reader`, `redmill`, `rssreader`, `settings`, `skills`, `smartlist`, `store`, `story`, `subbox`, `subscriber`, `sysinfo`, `tasks`, `terminal`, `todo`, `treasure`, `triggers`, `weather`, `weibo`, `wikitree`, `workshop`, `writerpad`
