# Kernel

Kernel 是无持久状态的一次运行执行引擎。它不拥有 chat、title、seq、context_start 或 SQLite；App 只把必要的运行元数据交给它生成状态行。

## 职责

- 接收一次 run 的完整 Responses API input
- 请求模型并流式解析响应
- 在内存维护本次 run 的模型/工具工作集
- 执行 bash、guard 与 `etc/tools.json` 注册的工具
- 停止正在运行的进程组
- 提供 run HTTP API

Kernel 不写 PID 或任何持久状态。根级 boot 是它的外部进程管理者。

## 一次 run

```text
App 选择历史并提交完整 input
             ↓
Kernel 请求模型
             ↓
模型无工具调用 ─────────────→ done
             ↓
模型调用工具
             ↓
Kernel 执行并把结果加入内存 input
             └──────────────→ 再次请求模型
```

模型的定稿 item 和工具结果通过当前 `POST /api/runs` 响应的 SSE 返回 App。App 负责落盘。run 结束后,Kernel 删除对应的 AbortController 和内存工作集。

## 故障语义

- **App 崩溃**:磁盘中的 `var/` 不受影响；当前连接断开会停止对应 Kernel run。boot 单独重启 App。
- **Kernel 崩溃**:当前 run 消失；App 的已持久化输入和历史仍在。boot 结束旧 App 并重启整套系统。
- **UI 崩溃**:App 和 Kernel 照常工作,Console 仍可连接 App。

Kernel 不实现 run 恢复。App 可以根据自己的磁盘事实决定是否重试,这属于产品策略。

## Bash 与工具

bash 是唯一内建工具。单次调用可传 `timeout_ms`，并受 `etc/config.json` 的 `bashMinTimeoutMs`、`bashDefaultTimeoutMs` 与 `bashTimeoutMs` 约束。stop 或请求连接断开时,Kernel 终止 bash 进程组。

bash 和外挂工具的 stdout/stderr 都受 `toolOutputMaxChars` 限制。Kernel 在读取子进程输出时就停止累积超限文本，避免大量输出先占满内存再截断。

`bin/guard` 是执行前策略钩子；`etc/tools.json` 声明额外工具,当前发行版提供 `bin/read`、`bin/write`、`bin/edit`。这些程序可修改、替换或删除,Kernel 只实现调用协议。

## 状态行

App 随 run 提交 chat、seq、context_start、上次 usage 与 App API 地址。Kernel 在每轮模型请求末尾生成状态行；工具循环中的最新 token usage 只保留在本次 run 内存里。

## Console 客户端

Console 源码目前放在 `kernel/console.js`，但它是客户端，不是 Kernel 服务职责。执行 `npm run console` 不会启动另一个 Kernel。正常情况下它连接 App API，创建或附着持久对话，并消费 App SSE；它与网页使用相同的写入和事件协议。

App 不可连接时,Console 自动改为直接调用 Kernel run API。跨轮历史只保存在当前 CLI 进程内存,退出即消失；这个模式用于检查和修复 App,不把持久化责任带回 Kernel。

## 外部启动

Kernel 服务不启动或监控 App。根级 `boot.js` 是外部 supervisor：等待 Kernel HTTP API 就绪后启动 App，并负责两个进程的故障策略。Kernel 收到 `SIGINT`/`SIGTERM` 时会中止全部 run、关闭 HTTP 服务后退出。`npm run kernel` 可绕过 Boot 独立启动 Kernel。
