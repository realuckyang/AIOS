---
name: sysinfo
description: 系统状态应用，通过快照 API 查看主机、CPU、内存、磁盘和进程状态。
backend: server/apps/sysinfo
frontend: ui/src/apps/sysinfo
database: none
---

# sysinfo

系统状态应用。用于查看本机运行状态，采用 HTTP 轮询快照，不走 WebSocket 流。

## 位置

- 前端：`ui/src/apps/sysinfo`
- 后端：`server/apps/sysinfo`
- 数据库：无

## API

- `GET /apps/sysinfo/snapshot`

返回主机信息、CPU 采样、内存、磁盘挂载点和 CPU 占用最高的进程列表。
