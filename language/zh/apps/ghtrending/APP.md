---
name: ghtrending
description: GitHub 趋势发现应用，拉取 GitHub Search API 数据并缓存 AI 分析结果。
backend: server/apps/ghtrending
frontend: ui/src/apps/ghtrending
database: database/apps/ghtrending.db
---

# GitHub Trending（ghtrending）

列出近期创建且 star 增长较快的 GitHub 仓库，支持按语言和时间范围筛选，并对仓库生成分析或批量摘要。

## API
- `GET /apps/ghtrending/list` - 获取仓库列表，参数：`language`、`since`
- `POST /apps/ghtrending/analyze` - 分析单个仓库，已有缓存时直接返回缓存
- `POST /apps/ghtrending/digest` - 对仓库列表生成摘要
- `POST /apps/ghtrending/check` - 批量检查仓库是否已有分析缓存
- `GET /apps/ghtrending/history` - 获取历史分析记录

## 数据表
- `gh_analyses(repo_id, repo_name, repo_url, repo_description, repo_language, repo_stars, repo_avatar, analysis, created_at)`

## 外部依赖
- GitHub Search API
- AI 分析服务由 `service/analyze.js` 和 `service/digest.js` 承载
