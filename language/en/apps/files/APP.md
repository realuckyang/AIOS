---
name: files
description: Files app for browsing, reading, uploading, deleting, renaming, and creating local files through the WebSocket file protocol.
backend: server/apps/files
frontend: ui/src/apps/files
database: none
---

# files

Files app. It browses the local filesystem inside AIOS and performs file operations over the shared WebSocket connection.

## Location

- Frontend: `ui/src/apps/files`
- Backend: `server/apps/files`
- Database: none

## WebSocket protocol

- `fs.home`: get the default directory
- `fs.list`: list a directory
- `fs.stat`: read file/directory metadata
- `fs.read`: read file content
- `fs.delete`: delete a file or directory
- `fs.mkdir`: create a directory
- `fs.rename`: rename a path
- `fs.upload.start` / `fs.upload.chunk` / `fs.upload.abort`: chunked upload

Responses come back through `fs.result`, `fs.read.meta`, `fs.read.chunk`, `fs.upload.ack`, and related messages.
