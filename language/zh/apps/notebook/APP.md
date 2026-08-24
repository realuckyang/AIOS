---
name: notebook
description: 笔记本 - 拟物风格,软木板上钉便签 + 夹板纸张编辑 + 12 种纸样 + AI 润色。替代旧 notes 应用。数据在 apps DB notes 表。
backend: server/apps/notebook
frontend: ui/src/apps/notebook
database: database/apps/notebook.db
---

# 笔记本(notebook)

拟物 + 手写感笔记应用,完全替代旧 notes(旧 notes 在 server/main/api/notes 仍然存在但不再有 GUI 入口)。

## 视觉

- **列表视图:** 软木板(SVG noise + 暗角)上钉着 12 种纸样的便签卡片,每张随机倾斜,顶部一颗图钉(红/蓝/黄/金属四色随机)。手写体 `Caveat / Kalam / STKaiti`,hover 卡片立起来。
- **编辑视图:** 棕色木质夹板,顶部金属夹子+铆钉,中间夹一张和列表卡片纸样匹配的 legal pad(红色装订条 + 8 种纸张样式)。
- **AI 抽屉:** 编辑底部抽屉,点鹅毛笔图标✦润色,AI 结果可"用这版替换"或关闭。
- **删除确认:** 暗红噪声纹理弹窗,带"撕掉"按钮。
- **FAB:** 右下角金属圆按钮,大号 +。

## 12 种纸样

`yellow-lined / pink-grid / white-grid / green-lined / blue-dot / orange-ruled / kraft / pink-lined / lavender-diag / mint-check / cream-cross / sky-ruled` —— 列表卡 (`card-*`) + 编辑纸 (`pad-*`) 一一对应。

## API

- `GET  /apps/notebook/list?q=&page=&pageSize=` 分页 + 关键词搜索
- `POST /apps/notebook/create` `{content, style?}` 不传 style 则随机
- `POST /apps/notebook/update` `{id, content}`
- `POST /apps/notebook/delete` `{id}`
- `POST /apps/notebook/optimize` `{content, prompt, taskTitle}` AI 润色,走 `instantTask`

## 数据表

`notes(id, content, style 0..11, created_at, updated_at)` —— 注意:**这个 `notes` 表在 `database/apps/notebook.db` 里,跟旧核心 `aios.db` 中同名 `notes` 表不冲突**(各自独立 SQLite 文件)。

## 与旧 notes 的关系

- 旧 notes 应用入口已从 `apps.js` 中移除(原 `id: 'notes'` 改为 `id: 'notebook'`)
- 旧后端 `server/main/api/notes/`、旧表 `aios.db.notes` 暂保留,等用户确认数据迁移后再清理
