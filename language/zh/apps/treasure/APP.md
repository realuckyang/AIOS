---
name: treasure
description: 藏宝阁 - 上传图片让 AI 鉴宝(物品/类别/成色/估值/点评)入库,主页展示藏品清单和总财富。数据在 apps_treasures,图片落 files/uploads/treasure/。
backend: server/apps/treasure
frontend: ui/src/apps/treasure
database: database/apps/treasure.db
---

# 藏宝阁

让 AI 当鉴宝师。用户上传一张图片,AI 识别物品 + 给出名称/类别/成色/总结标签/人民币估值/点评,入库归档。主页像古风账册一样列出全部藏品和总财富。

## API

- `POST /apps/treasure/upload` — base64 图片上传到 `files/uploads/treasure/`
- `POST /apps/treasure/appraise` — 读图 → `instantTaskJson` 鉴宝 → 入 `apps_treasures` 表
- `GET  /apps/treasure/list?page=&pageSize=` — 分页列表 + 总财富
- `GET  /apps/treasure/detail?id=`
- `GET  /apps/treasure/image?id=` — 直出图片(jpg/png/webp)
- `POST /apps/treasure/delete`

## 数据表

`apps_treasures(id, image_path, name, category, condition_text, summary_tag, value, comment, created_at)`

## 设计语言

- 米黄古纸 #f5f0e8 + 棕褐 #5a3e28 + 烫金 #b8853a
- 宋体 (`Songti SC` / `STSong`) 衬线为主,数字用 Georgia 衬线
- 顶栏一颗"寳"字红铜印章
- 入库按钮做成圆角长条,带 inset 烫金高光
- 详情抽屉从底部滑出,大图 + 估值 + 引言式点评卡

## 安全

- `appraise` 校验 `imagePath.startsWith(UPLOAD_DIR)`,防止读任意文件
- `upload` 限制后缀 `.png/.jpg/.jpeg/.webp` + 8MB 上限
- `image` 只读 `apps_treasures.image_path` 数据库里登记过的路径
