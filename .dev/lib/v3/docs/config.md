# 配置

配置是环境,不是数据,全部在库外(仓库根的 `config.json` + `instructions.md`)。启动时读取,人改完重启内核生效,不做热加载(内核宁蠢勿巧)。

库外配置归四类,每类性质不同。

## 一、资源坐标:内核挂到哪个世界上

| 项 | 含义 |
| --- | --- |
| `responsesUrl` | 完整的 Responses API 地址,内核直接请求,不追加路径 |
| `apiKey` | 模型服务密钥;未配置时模型请求直接报错,不发送 |
| `model` | 模型名 |
| `kernelPort` | 内核端口,默认 9600 |
| `userlandPort` | userland 端口,默认 9601(经环境变量传给 init 拉起的进程) |

「主板插了什么 CPU」级别的事实——模型服务就是这台机器的处理器,端口是总线地址。内核对它们零判断,照着连。

## 二、钩子指向:内核在特定时机咨询/拉起哪个 userland 可执行物

| 钩子 | 时机 | 机制(内核) | 策略(userland) |
| --- | --- | --- | --- |
| `init` | 内核启动后 | spawn + 退避重启 | `userland/serve.js`:跑什么服务 |
| `guard` | bash 执行前 | 调用,exit 0 放行、非 0 拒绝(stdout 为理由);不可执行时放行并警告 | `userland/bin/guard`:什么算灾难 |
| 工具注册表 | 组装请求 / 收到 function_call | `kernel/tools.js`:并入声明、按 name 分发、超时与错误兜底 | `userland/tools.json` + 各 exec:有什么工具 |

共同形状:**机制一句话在内核,判断全在被指向的文件里。** 所有「内核好像该懂点什么」的冲动,先问能不能做成这一类。

### 工具分发钩子

九成的「加工具」不需要它:工具 = userland 的一个 CLI + 指令里一行用法,bash 是万能适配器(新能力 = 新命令,不是新 syscall)。剩余场景才需要内核配合:非文本输出(图像 item)、强 schema 约束、模型服务端自带的工具(如 web_search,纯声明、服务端执行)。按 FUSE / 微内核用户态驱动的形状实现:

- `userland/tools.json`(不存在则视为空,零额外工具)声明工具列表,元素两种形态:
  - `{ name, description, parameters, exec }`:function 工具,`exec` 是相对仓库根的可执行文件路径;
  - `{ type: "web_search", ... }` 等无 `exec` 字段的对象:纯声明,原样并入请求 tools,执行发生在模型服务端,内核不参与也不会收到对应的 function_call。
- 内核组装请求时,把 `[bash 工具, ...userland/tools.json 里声明的 function 工具]` 一起发给模型;每次唤醒重新读取该文件,agent 改完下一轮即生效,不需要重启内核。
- 收到 function_call 时按 `name` 分发:`bash` 内建执行(guard 钩子照旧);在注册表里的,spawn 对应 `exec`,把 `arguments`(JSON 字符串)整段写入其 stdin;都不是则说明模型调了不存在的工具,直接把这当结果告诉它。
- exec 的 stdout 若本身是合法 JSON,原样作为 `function_call_output.output` 透传——exec 自己决定输出形状,这是多模态/结构化结果的口子;不是合法 JSON 则按 bash 的形状包一层 `{exit_code, stdout, stderr}`。单条调用超时复用 `bashTimeoutMs`。
- bash 不进注册表:它是创世工具,内核必须自带至少一条触碰世界的通道,且 stop 的进程组语义住在它身上。

## 三、执行环境参数:资源限额

| 项 | 含义 |
| --- | --- |
| `workdir` | bash 工作目录,相对仓库根解析,默认仓库根 |
| `bashTimeoutMs` | 单条命令超时,默认 600000 |

对应 ulimit / 内核启动参数。内核里另有几个**写死的常量**(输出截断 50k 字符、SSE 缓存 1000 条、init 退避上限 60s、guard 咨询超时 5s)——本质同类,但提成配置只是给人类增加无意义的决定,按内核编译期常量处理;data 目录位置(仓库内 `data/`)同理。有真实需要再提。

## 四、固定指令:`instructions.md`

单独一类,性质特殊:不是给内核看的,是内核**转交给模型**的——内核机制与 userland 约定之间唯一的桥。内容只说四件事:内核给模型的东西(状态行、数据直读、写走 API、libc、guard)、约定(子对话、通知自己、压缩、记忆技能)、边界(kernel 冻结、userland 归 agent)、审慎条款。措辞质量直接决定约定能否自发运转。

提示词是环境而不是数据,所以与 config.json 并排在库外,人可直接编辑调优;agent 改它属于自我修改,按约定先备份。

## 判据:一个值该放哪

- 每台机器/每次部署**由人选定的事实**(连哪个模型、哪个端口、多大限额)→ `config.json`;
- 背后是**判断和行为**(什么算灾难、跑什么服务、有什么工具)→ userland 文件,config 只留指针;
- **无人关心的内部数字** → 内核常量,不配拥有配置项;
- **对话产生的内容** → 不是配置,是数据,归 `data/`,单写者是内核。
