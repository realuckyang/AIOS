# AGENT

一个在本机运行的 coding agent：浏览器里对话，Node.js 后端负责模型调用、bash 执行、上下文压缩和对话间异步调用。

项目目前处于早期开发阶段。AGENT 不绑定特定模型供应商，可连接任意兼容 OpenAI Responses API 的模型服务。应用本身没有账号或登录系统；服务仅监听 `127.0.0.1`，对话、配置和运行记录保存在本机 SQLite 数据库中。

## 功能

- React 对话界面与实时 SSE 事件流
- 通过 bash 读取、修改文件并执行系统命令
- 自动工具循环与可中止的后台任务
- 对话可以异步创建或调用其他对话，并自动接收结果
- 基于真实 token 用量的上下文压缩
- 本地 SQLite 持久化

用户创建的顶层对话显示在左侧；Agent 派生的执行对话显示在右侧只读面板。点击“新对话”只打开空白草稿，发送第一条消息时才真正创建记录。

## 环境要求

- Node.js 22.14 或更高版本
- npm
- 一个兼容 OpenAI Responses API 的模型服务

## 快速开始

```bash
git clone https://github.com/yanglongyun/AGENT.git
cd AGENT/v1
npm install
```

构建前端并启动服务：

```bash
npm run build
npm start
```

然后打开 <http://127.0.0.1:9522>。

首次使用时，在页面的“设置”中填写完整的 Responses API 地址、密钥和模型名称，例如 `https://example.com/v1/responses`。AGENT 直接请求填写的地址，不会自动追加路径。模型请求必须携带密钥，未配置时会直接显示错误，不会发送请求。

开发前端时可运行 `npm run dev`。Vite 会把 `/api` 请求代理到 `9522`，因此后端仍需另开一个终端执行 `npm start`。

## 配置

| 变量 | 用途 | 默认值 |
| --- | --- | --- |
| `PORT` | 本地服务端口 | `9522` |
| `DB_PATH` | SQLite 数据库路径 | `data/agent.db` |

完整 Responses API 地址、密钥、模型名称、上下文压缩水位和提示词保存在 SQLite 的 `settings` 表中，可通过设置页面或 `/api/settings` 管理。AGENT 不设置模型输出上限、模型请求超时或 Agent 执行步数上限，只负责本地运行和调用配置好的模型服务，不依赖某个指定平台。

## 项目结构

```text
server/agent/       独立模型执行引擎与 bash
server/llm/         Responses API 请求、输入整理与 SSE 解析
server/api/         HTTP 与 SSE handlers
server/service/     对话、调用、运行时和事件业务
server/repository/  SQLite 数据访问
ui/                 React 前端
docs/               架构与协议文档
schema.sql          SQLite schema
```

## 安全说明

这个 agent 能执行命令并修改文件。只在你信任的机器和工作目录中运行，不要将服务暴露到公网。`data/` 中可能包含模型服务凭据和私人对话数据，已被 Git 忽略，不要提交或分享。

## 文档

- `docs/backend.md`：后端分层
- `docs/frontend.md`：前端结构
- `docs/api.md`：HTTP API
- `docs/event.md`：SSE 事件
- `docs/call.md`：异步调用
- `docs/settings.md`：运行配置
- `docs/schema.sql`：核心 DDL

## License

[MIT](LICENSE)
