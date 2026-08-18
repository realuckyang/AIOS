# 配置

配置是环境，不是对话数据，集中放在 `etc/`。`config.json` 保存结构化运行参数，`instructions.md` 保存模型固定指令，`tools.json` 保存扩展工具声明。启动整套系统时，Boot 读取端口，Kernel 读取完整配置，App 通过 Boot 提供的环境变量取得端口。

## 资源坐标

| 项 | 含义 |
| --- | --- |
| `responsesUrl` | 完整的 Responses API 地址 |
| `apiKey` | 模型服务密钥 |
| `model` | 模型名 |
| `kernelPort` | Kernel run API 端口，默认 9522 |
| `appPort` | App API/UI 端口，默认 9523 |
| `guard` | guard 程序路径，相对项目根目录解析；空值表示不咨询 |
| `tools` | 工具注册表路径，相对项目根目录解析 |

## Kernel 可执行钩子

| 钩子 | Kernel 机制 | 外部策略 |
| --- | --- | --- |
| `guard` | bash 前执行；exit 0 放行，其他值拒绝 | `bin/guard` 决定什么算灾难命令 |
| 工具注册表 | 组装工具声明并按名称分发 | `tools` 指向的 JSON，通常引用 `bin/` 程序 |

发行版在 `etc/tools.json` 预装 `read`、`write`、`edit`。带 `exec` 的 function 工具从 stdin 接收 JSON 参数；stdout 是合法 JSON 时原样返回，否则包装为普通命令结果。无 `exec` 的服务端工具声明原样交给模型服务。注册表在每次 run 开始时重新读取，修改后无需重启。

`bash` 不在注册表中：它是 Kernel 自带的创世工具，并承载 guard、超时、stop 与进程组语义。

## 执行参数

| 项 | 含义 |
| --- | --- |
| `workdir` | bash 工作目录，相对仓库根解析 |
| `bashTimeoutMs` | bash 和扩展工具允许的硬上限，默认 600000 ms |
| `bashDefaultTimeoutMs` | bash 调用未指定 `timeout_ms` 时的默认值，默认 30000 ms |
| `bashMinTimeoutMs` | bash 单次调用允许的最小超时，默认 1000 ms |
| `toolTimeoutMs` | 外挂工具执行超时，默认 600000 ms |
| `toolOutputMaxChars` | bash 与外挂工具的 stdout/stderr 单流字符上限，默认 50000 |
| `requestBodyMaxBytes` | App 与 Kernel HTTP 请求体上限，默认 1048576 bytes |
| `sseEventMaxBytes` | 模型、Kernel 与 Console 单个 SSE 事件上限，默认 1048576 bytes |
| `eventBufferSize` | App 为 UI 保留的 SSE 事件数，默认 1000 |
| `guardTimeoutMs` | guard 咨询超时，默认 5000 ms |
| `bootReadyTimeoutMs` | Boot 等待 Kernel 就绪的时间，默认 15000 ms |
| `bootBackoffMaxMs` | Boot 重启退避上限，默认 60000 ms |
| `shutdownTimeoutMs` | Boot/Kernel 正常关闭等待时间，默认 5000 ms |
| `consoleConnectTimeoutMs` | Console 探测 App 的超时，默认 1500 ms |

模型可按任务指定单次 bash 调用的 `timeout_ms`；Kernel 会将它限制在 `bashMinTimeoutMs` 与 `bashTimeoutMs` 之间，未指定时使用 `bashDefaultTimeoutMs`。

少量实现常量保持在代码中，例如输出截断、App SSE 缓存、boot 重启退避上限和 guard 咨询超时。有真实需求再提升为配置项。

## 固定指令

`etc/instructions.md` 由 Kernel 随 run 交给模型，说明状态行、App API、开放文件能力、工具与自我管理约定。它与 `config.json` 都在 Kernel 启动时加载；修改后重启系统生效。`etc/tools.json` 则在每次 run 开始时读取，可以热更新。

## 一个值该放哪

- 部署者选定的环境事实 → `etc/config.json`
- 模型固定环境说明 → `etc/instructions.md`
- 外部工具声明 → `etc/tools.json`，实现通常在 `bin/`
- 对话和产品状态 → `var/`，由 App 日常协调写入
- Boot PID 等可丢弃运行态 → `run/`
- 无人需要选择的内部数字 → 代码常量
