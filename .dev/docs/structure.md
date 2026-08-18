# 项目目录

目录直接表达边界：根级 Boot 管服务进程，`kernel/` 只执行一次 run，`app/` 拥有产品状态，`var/` 保存持久数据，`run/` 保存可丢弃的运行态，环境配置集中在 `etc/`。

```text
AGENT/
├── README.md
├── package.json
├── boot.js                    # 总启动器：启动、监控 Kernel 与 App
├── stop.js                    # 根据 run/boot.pid 停止整套系统
├── etc/
│   ├── config.example.json   # 可提交的运行配置模板
│   ├── config.json           # 本机模型、端口与超时配置（git 忽略）
│   ├── instructions.md       # 每轮交给模型的固定指令
│   └── tools.json            # 扩展工具注册表
├── bin/
│   ├── guard                 # bash 执行前的策略钩子
│   ├── read
│   ├── write
│   └── edit
├── kernel/
│   ├── index.js              # Kernel 入口，只启动 run API
│   ├── paths.js              # 仓库根路径
│   ├── run.js                # 当前 run 与 AbortController，仅内存
│   ├── llm.js                # Responses API 与流解析
│   ├── loop.js               # 单次模型/工具循环
│   ├── bash.js               # shell、超时、进程组终止、输出截断
│   ├── tools.js              # 读取工具注册表并执行扩展工具
│   ├── utils.js              # 有界文本、HTTP JSON 与 SSE 共享机制
│   ├── api.js                # POST /api/runs、状态与 stop
│   └── console.js            # 终端客户端，连接 App API
├── app/
│   ├── server/
│   │   ├── index.js          # App 入口与 UI 静态托管
│   │   ├── api.js            # 面向 UI/agent 的 chats API
│   │   ├── store.js          # var/aios.db 的 SQLite 存储与分页
│   │   ├── context.js        # 跨轮上下文选择与 Kernel 输入组装
│   │   ├── run.js            # 对话调度、调用 Kernel、持久化结果
│   │   └── events.js         # 面向 UI 的 SSE 事件流
│   └── ui/                   # React + TypeScript + Vite
├── skills/                    # 发行 Skills（App 扫描展示，Kernel 不读取）
├── var/                      # App 持久状态（git 忽略）
│   └── aios.db                # SQLite 对话事实
├── run/                      # 可丢弃的进程运行态（git 忽略）
│   └── boot.pid
└── .dev/
    ├── docs/                 # 当前设计文档
    └── lib/                  # 历史版本
        ├── v1/
        ├── v2/
        └── v3/
```

## 边界与规则

- Kernel 不拥有 chat、title、seq、`context_start` 的存储语义，也不读写 `var/`；App 为每次 run 组装完整输入和必要元数据。
- boot 只负责进程现实：先启动 Kernel 再启动 App、监控退出、统一停止；它不处理模型或产品数据。
- App 管理对话、调度、跨轮上下文、持久化和 UI 事件；`var/` 日常写入走 App API，特殊修复仍可直接操作文件。
- `run/` 的内容重启后可以丢失，不能放产品事实。
- 稳定是约定，不是权限限制。普通能力优先长在 `app/`、`bin/` 和 `etc/`；真实问题属于 Kernel 时仍可修改。
- 根包只依赖 Node 22+ 内置能力；`app/ui` 独立管理 React/Vite 依赖。
- Kernel 默认监听 `:9522`，App 默认监听 `:9523`。浏览器、CLI 和 agent 的常规读写都连接 App；App 调用 Kernel。
- Boot 和 Kernel 启动时加载 `etc/config.json`；Kernel 同时加载 `etc/instructions.md`；`etc/tools.json` 每次 run 重新加载。

## 进程关系

```text
boot.js
├── kernel/index.js
└── app/server/index.js
```

App 是 Kernel 的 HTTP 客户端，不是 Kernel 子进程。两者在操作系统层面都是 Boot 的直接子进程。

## 与历史 v1 实现的对应

| `.dev/lib/v1` | 当前实现 |
| --- | --- |
| repository(SQLite) | `app/server/store.js` + `app/schema.sql`（node:sqlite） |
| runtime/recover | `app/server/run.js` + `kernel/run.js`，状态只在内存 |
| agent/context | `app/server/context.js` |
| llm/runner | `kernel/llm.js` + `kernel/loop.js` |
| API/events | App chats API/SSE + Kernel run API/SSE |
| UI | `app/ui` |
| settings | `etc/config.json` + `etc/instructions.md` |
