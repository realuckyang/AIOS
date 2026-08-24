---
name: terminal
description: Terminal app for managing local shell sessions over WebSocket, including create, switch, input, resize, and close.
backend: server/apps/terminal
frontend: ui/src/apps/terminal
database: none
---

# terminal

Terminal app. The backend owns local shell sessions; the frontend provides input, output, tabs, and a bottom tool panel.

## Location

- Frontend: `ui/src/apps/terminal`
- Backend: `server/apps/terminal`
- Database: none

## WebSocket protocol

- `terminal.list`: list terminals
- `terminal.create`: create a terminal
- `terminal.activate`: switch the active terminal
- `terminal.close`: close a terminal
- `data.input`: send input
- `system.resize`: resize a terminal
- `system.command`: run a built-in system command

The backend pushes `terminal.list`, `terminal.created`, `terminal.closed`, `terminal.activated`, `system.init`, `data.output`, and `terminal.error`.
