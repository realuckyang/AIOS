---
name: sysinfo
description: System Status app for inspecting host, CPU, memory, disk, and process snapshots.
backend: server/apps/sysinfo
frontend: ui/src/apps/sysinfo
database: none
---

# sysinfo

System Status app. It shows local machine health through a polling HTTP snapshot API rather than a WebSocket stream.

## Location

- Frontend: `ui/src/apps/sysinfo`
- Backend: `server/apps/sysinfo`
- Database: none

## API

- `GET /apps/sysinfo/snapshot`

Returns host info, CPU sample, memory, disk mount points, and the top processes by CPU usage.
