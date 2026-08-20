# AIOS

由 AI 驱动的操作系统。你用自然语言向计算机发出指示,agent 替你执行、为你构建;
界面、应用、乃至 agent 自己的工具,都在使用中被塑造。

---

### 理念

**一切都可以换,不可变的只有一份契约。**

内核、壳、界面、工具,连 Boot 自己,都是可以重写的。差别不在能不能改,
而在改错了能不能退回来。

系统里唯一不变的,是 Boot 对一份内核提的三条要求:

1. 在 `KERNEL_PORT` 上监听 HTTP;
2. 就绪探针 `GET /api/runs/__boot__` 返 2xx;
3. 认 `SIGTERM`,退出时终止自己拉起的工具进程组。

满足这三条,任何一份内核都能被 Boot 看护。契约就三行,内核因此是自由的。

在这份契约之上,壳是 userland:对话管理、持久化、上下文策略、界面,
都运行在内核之上、都可以被改写。要不要应用、应用长什么样、
甚至要不要这套对话界面,都是可变项。agent 的工具也不是出厂写死的清单
——版本目录里的 `etc/tools.json` 是注册表,`bin/` 下是可执行程序,
agent 可以为自己编写新工具并注册进来。调用方式同样开放:agent 可以递归调用自己,
外部程序可以直接走 API,也可以写脚本把多次调用编排成程序化流程。

**改得动,是因为退得回。** 四件事撑着这一点:

- **Boot 在系统之外**,只做三件事——启动进程、交出环境、隔离版本。
  它不认识任何版本目录的名字,跑哪一版由 `etc/current.json` 这个指针决定;
- **版本目录只装代码**,`var/` 与 `etc/env.json` 在版本之外,所以回滚不丢对话;
- **新版起不来会自动退回**,连续三次启动失败即回落到 `backup`,不需要人守在终端前;
- **逃生通道独立于被进化的部分**:Kernel 无持久状态、崩了重启即回到干净态;
  `guard` 与出厂 `bin/` 工具是地板;App 被改坏时 `npm run cli -- --direct` 直连 Kernel,
  不经 App 就能发起一次 run 把它修回来。

真正没有网的只剩两处,值得单独记住:**Boot 换自己**——它上面没有看护者,
改错了得由人进终端;**对 `var/` 的破坏性迁移**——代码能回滚,写下的事实回不去。

对话擅长表达意图,不擅长承载结果 —— 形态即是功能,形态就是价值。
所以进化的产出应当凝固成稳定的形态:应用、界面、可复用的工具,
而不是永远保持液态。衡量这个系统的标准只有一条:**能否更快地长出更好的形态。**

---

### 架构

```text
boot.js                启动 · 环境 · 版本隔离。只用 Node 内置模块,零依赖
stop.js
etc/env.json           环境:模型凭据、端口、Boot 超时(不进 Git)
etc/current.json       版本指针 { current, preview, backup }
var/                   持久事实 aios.db,跨版本共享
run/                   宿主运行态 boot.pid,可丢弃
versions/<id>/         一个版本 = 一整套 userland
  ├── kernel/          :9522  无持久状态,单次 run 的模型工具循环
  ├── app/             :9523  有状态,对话/SQLite/上下文策略/UI
  ├── bin/             tools/ 给模型 · hooks/ 给内核
  ├── cli/             终端界面(Ink),走 App;App 坏了退到直连 Kernel
  ├── skills/
  ├── etc/             instructions.md · tools.json · limits.json
  └── host.js          版本对宿主环境的唯一入口
```

- **Kernel**:Responses API、内存工具循环、bash、扩展工具执行、run/stop HTTP API。
  不拥有 chat,不启动 App,不读写对话历史。
- **App**:拥有对话与持久事实(`var/aios.db`),选择跨轮上下文,把完整 input 交给
  Kernel。App 崩溃不损坏磁盘事实,Kernel 崩溃不需要恢复聊天状态。

边界判断:宿主进程编排进 Boot;一次模型执行无法外包的机制进 Kernel;
持久状态和产品策略进 App/userland。

**设置放在哪**,判据是「谁在什么时刻读它」:

| 处 | 内容 | 改完 |
| --- | --- | --- |
| `var/aios.db` 的 `settings` 表 | 模型、上下文、计价、压缩、执行参数 | 立即生效 |
| `etc/env.json` | 凭据、端口、Boot 超时 —— Boot 在库存在之前就要读 | 需重启 |
| `versions/<id>/etc/limits.json` | guard 与工具注册表的路径、Kernel 建 HTTP 服务器的参数 | 需重启 |

执行参数能放进库,是因为它们**随 run 下发**:App 每次调 `POST /api/runs` 时把 model、
bash 超时这些一起带过去,Kernel 不必自己读配置。下发通道只认白名单里的键,
凭据、端口、guard 路径改不了。

Boot 把路径与端口作为环境变量交给子进程,凭据只交出文件位置、不交出值,
因此新建一个版本目录是纯代码复制,不含秘密。

版本内的 `host.js` 是这套环境的唯一入口。被 Boot 拉起时读环境变量,
脱离 Boot 单独运行时按自身位置回推同一套 `etc/`、`var/`、`run/`
——两种模式看到的目录完全一致。

---

### 版本

`etc/current.json` 是全系统唯一决定「跑哪一版」的地方:

```json
{ "current": "v4", "preview": null, "backup": "v3" }
```

角色只有三个,而版本目录想留几份留几份——`versions/` 下的目录跑不跑,
只取决于它在不在指针里。历代版本就留在那儿,不另设存档区。

**换一版**:整份复制版本目录,改完把 `current` 指向新版、`backup` 指向旧版,
然后让 Boot 重载。切换是写一次 JSON(临时文件加 rename),目录自始至终不动,
所以不存在「换到一半」的中间态。

```bash
kill -HUP $(cat run/boot.pid)   # 指针换了版本就整套切过去,没换就只重启 App
```

agent 自己走的是同一条路:改完指针后通过 App API 提交重启申请,
人在前端确认,App 再向 Boot 发 `SIGHUP`。

**退回去**:新版连续三次起不来,Boot 自动把 `current` 改回 `backup` 并重启;
启动时若 `current` 指向的目录不存在或没有 `kernel/index.js`,同样退到 `backup`。
两种回落都会把指针改写成事实,不留下与磁盘不符的指向。

`preview` 是给「先验后升」预留的:内核无持久状态,可以在临时端口上先拉起候选版本、
按上面三条契约验一遍再置顶。Boot 目前不读这个字段,写了也不会生效。
App 绑着 `var/`,不能并行,只能切过去、坏了回落。

---

### 快速开始

需要 Node.js 22+ 和一个兼容 OpenAI Responses API 的模型服务。

```bash
cp etc/env.example.json etc/env.json
# 填写 responsesUrl、apiKey、model

cd versions/v4/app/ui && npm install && npm run build && cd -
npm start
```

浏览器打开 <http://127.0.0.1:9523>。

| 命令 | 作用 |
| --- | --- |
| `npm start` | 启动 Boot,按 `etc/current.json` 拉起 Kernel `:9522` 和 App `:9523` |
| `npm stop` | 通知 Boot 统一关闭 App 和 Kernel |
| `kill -HUP $(cat run/boot.pid)` | 重载:换版本或只重启 App |
| `cd versions/v4 && npm run kernel` | 只启动 Kernel,独立调试 |
| `cd versions/v4 && npm run app` | 只启动 App |
| `cd versions/v4 && npm run cli` | 终端界面 |
| `cd versions/v4 && npm run cli -- run "任务"` | 跑一次就退,正文走 stdout |
| `cd versions/v4 && npm run cli -- --direct` | 逃生通道:绕开 App 直连 Kernel |

命令里的 `v4` 是此刻指针指向的版本,换版本后随之改变。

---

### 安全

这个 agent 能执行命令并修改文件,只在信任的机器上运行,不要暴露到公网。
`var/`、`run/`、`etc/env.json` 已被 Git 忽略。
