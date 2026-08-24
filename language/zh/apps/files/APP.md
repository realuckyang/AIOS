---
name: files
description: 文件应用，通过 WebSocket 文件协议浏览、读取、上传、删除、重命名和新建本机文件。
backend: server/apps/files
frontend: ui/src/apps/files
database: none
---

# files

文件应用。用于在 AIOS 内浏览本机文件系统，并通过统一 WebSocket 连接执行文件操作。

## 位置

- 前端：`ui/src/apps/files`
- 后端：`server/apps/files`
- 数据库：无

## WebSocket 协议

- `fs.home`：获取默认目录
- `fs.list`：列目录
- `fs.stat`：读取文件/目录状态
- `fs.read`：读取文件内容
- `fs.delete`：删除文件或目录
- `fs.mkdir`：新建目录
- `fs.rename`：重命名
- `fs.upload.start` / `fs.upload.chunk` / `fs.upload.abort`：分片上传

所有响应通过 `fs.result`、`fs.read.meta`、`fs.read.chunk`、`fs.upload.ack` 等消息返回。
