# 项目目录

目录结构直接映射架构:**kernel/ 冻结,userland/ 归 agent,data/ 归内核单写,配置在库外(根目录)**。

```text
v3/
├── README.md                  # 快速开始
├── package.json               # 只有 scripts,零 dependencies
├── config.json.example        # 模型服务地址、密钥、模型名、端口、init 命令
├── instructions.md            # 固定指令(内核注入给模型的那段桥;环境,人可调)
│
├── kernel/                    # ★ 冻结区:人写,agent 不可改
│   ├── index.js               # 入口与总装:读配置 → 启 API → init 拉起 userland
│   │                          #   `node kernel/index.js` 启动内核
│   │                          #   `node kernel/index.js console [chat-id]` 进入 CLI console
│   ├── store.js               # data/ 唯一写者:meta.json(temp+rename)、items.jsonl(追加)
│   ├── run.js                 # 调度:消息即运行、同对话不并发、AbortController
│   ├── context.js             # input 组装:指针之后取 items + 注入水位状态行
│   ├── llm.js                 # Responses API 请求构造与 SSE 流解析
│   ├── loop.js                # 模型工具循环:调 llm → 执行 bash → 继续,产出事件
│   ├── bash.js                # shell 子进程:cwd、超时、进程组终止、输出截断
│   ├── tools.js                # 工具分发钩子:读 userland/tools.json,按 name 分发到 exec
│   ├── api.js                 # HTTP 路由:chats CRUD、messages、stop、只读查询
│   ├── events.js              # SSE bus:全局事件 ID、缓存、Last-Event-ID 补发、gap
│   ├── init.js                # spawn userland 进程,退出退避重启
│   └── console.js             # CLI console:行进流式出,API 客户端,不直写文件
│
├── userland/                  # ★ agent 可写区:可改、可重启、可炸
│   ├── serve.js               # userland 服务入口:静态托管 ui/ + 未来的服务端造物
│   ├── ui/                    # 默认对话浏览器:buildless,原生 ES modules,无框架
│   │   ├── index.html
│   │   ├── app.js             # 状态、渲染、SSE 订阅
│   │   ├── api.js             # 内核 API 客户端(经 serve.js 的 /api 反代,同源)
│   │   └── style.css
│   └── bin/
│       ├── agent-cli          # 预装 libc:curl 包装(send/spawn/forget…),agent 可改可增
│       └── guard              # 默认灾难命令策略:内核 guard 钩子的默认发行物,agent 可改
│
├── data/                      # ★ 内核单写区:agent、userland 读走文件,写走 API
│   └── chats/<chat-id>/
│       ├── meta.json          # title、description、context_start、时间戳
│       └── items.jsonl        # 一行一条:{seq, source, item, usage, at}
│
└── docs/                      # 本设计文档
```

## 边界与规则

- **kernel/ 的冻结是约定,不是技术强制**:固定指令中声明 agent 不修改 kernel/ 与 data/;git 是审查手段。data/ 的单写者由「写必须走 API」保证。
- **零依赖**:全仓无 npm dependencies,只用 Node 22+ 内置能力(http、fs、child_process)。package.json 仅保留 `start` 与 `console` 两个 scripts。没有 node_modules,没有 build,`git clone` 即完整源码。
- **buildless UI**:userland/ui 直接被 serve,改完刷新即生效。agent 升级 UI:改文件 → git commit → kill userland 进程 → init 拉起新版。
- **端口**:kernel `:9600`,userland `:9601`(均可在 config.json 改;v1 的 9522 不受影响)。浏览器访问 userland;userland 与 CLI 都是 kernel API 的客户端。
- **instructions.md 是环境不是代码**:它是内核机制与 userland 约定之间唯一的桥,人可以直接编辑调优;agent 改它属于自我修改,按约定先备份。
- **配置生效方式**:config.json 与 instructions.md 启动时读取;人改完重启内核即可,不做热加载(内核宁蠢勿巧)。

## 规模预期

kernel/ 共 12 个文件,每个单一职责,全部在一二百行以内;userland 首发只有默认 UI、libc 脚本与默认 guard 策略,`userland/tools.json` 默认不存在(零额外工具)。没有 TypeScript、没有打包器、没有测试框架(内核小到用几个裸 node 断言脚本即可,后续按需加)。

## 与 v1 实现的对应

| v1 | v3 |
| --- | --- |
| server/repository(SQLite) | kernel/store.js(JSONL) |
| server/service/runtime + recover | kernel/run.js(status 在内存,无 recover) |
| server/service/calls | 删除(userland 约定) |
| server/agent/compaction + compactions 表 | 删除(指针 + userland 约定) |
| server/agent/context | kernel/context.js(退化为指针取数 + 水位) |
| server/llm | kernel/llm.js |
| server/agent/runner | kernel/loop.js |
| server/api + events | kernel/api.js + events.js |
| ui(React + Vite) | userland/ui(buildless 原生 ESM) |
| settings 表 | config.json + instructions.md(库外) |
| —— | kernel/console.js、kernel/init.js、userland/serve.js(新增) |
