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

- **Boot 在系统之外**,只做两件事——启动进程、交出环境;
- **代码与事实分开**,`var/` 与 `etc/env.json` 不在代码里,所以回滚不丢对话;
- **回滚交给 Git**:代码直接摆在根目录,不再有版本指针 —— 代价是回滚需要人进终端,
  不像旧的指针回落那样无人值守;
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
boot.js                启动 · 交出环境 · 看护。只用 Node 内置模块,零依赖
stop.js
host.js                宿主路径的唯一入口:HOME / VAR / RUN / ENV
etc/                   env.json(凭据端口,不进 Git) · limits.json · tools.json · instructions.md
var/
  ├── aios.db          框架库:8 张表,只装框架自己的事实
  ├── apps/<id>.db     应用库:一个应用一个文件
  └── files/           落盘的图片与附件
run/                   宿主运行态 boot.pid,可丢弃
bin/                   tools/ 给模型 · hooks/ 给内核与启动检查
kernel/                :9522  无持久状态,单次 run 的模型工具循环
app/                   :9523  有状态的壳
  ├── index.js         进程入口:装配框架、扫描挂载应用、托管 dist
  ├── main/            ── 框架 ──
  │   ├── server/      db/ · repository/ · service/ · api/
  │   └── ui/          壳 · 路由 · 对话界面 · 注册表 · 公共件
  ├── apps/            ── 应用 ──
  │   ├── _shared/     createAppDb(自己的库) · task(调模型的唯一入口)
  │   └── <id>/        APP.md · server/{api,repository} · ui/{meta,index}
  └── shared/          纯工具,无状态
skills/                Agent 可读取、复用的技能说明与资源
integrations/          外部系统集成
  └── browserctl/      浏览器连接器:本地 bridge 服务 · Chrome 扩展
cli/                   终端界面(Ink),走 App;App 坏了退到直连 Kernel
```

- **Kernel**:Responses API、内存工具循环、bash、扩展工具执行、run/complete HTTP API。
  不拥有对话,不启动 App,不读写历史。
- **App**:拥有线程与持久事实,选择跨轮上下文,把完整 input 交给 Kernel。

**框架与应用的分界**,判据是「这张表/这段代码没了,还是不是一个能跑的对话运行时」:

| | 装什么 | 用哪个库 |
| --- | --- | --- |
| `app/main/` | threads · messages · usage · compactions · settings · chats · tasks · restarts | `var/aios.db` |
| `app/apps/<id>/` | 这个应用自己的事实 | `var/apps/<id>.db` |

主干是 **threads**:一切消息流的身份。`chats` 与 `tasks` 是它的两种侧写,
各自只存「作为产品对象」的字段;「作为消息流运转」所必需的(`context_start`)留在主干,
`messages` / `usage` / `compactions` 三张挂表也只认 `thread_id`。

**任务**是这版的关键机制。压缩摘要、应用调模型、将来模型自调用,全部落成 task ——
开线程、落消息、记账,走和对话完全相同的路。重点不是「多了一种任务」,
而是**没有第二条通往模型的路**:老版压缩那笔消耗只写进 `compactions.tokens`,
状态行和用量应用都看不见,于是花了钱账上没有。现在这种漏账在结构上不可能发生。

应用与框架的边界不是约定而是**拿不到**:框架库的 client 只被 `main/server/repository/*` 导入,
应用能拿到的唯一句柄来自 `apps/_shared/db.js`。`bin/hooks/check-boundaries` 在每次启动时复核。

**成本是写下来的事实,不是每次重算的估算。** 消息落库时一并记下当时的模型、
单价快照与折算成本,所以改单价不会让历史金额跳动,换模型也不会让旧 token 被按新价折算。

**设置放在哪**,判据是「谁在什么时刻读它」:

| 处 | 内容 | 改完 |
| --- | --- | --- |
| `var/aios.db` 的 `settings` 表 | 模型、上下文、计价、压缩、执行参数 | 立即生效 |
| `etc/env.json` | 凭据、端口、Boot 超时 —— Boot 在库存在之前就要读 | 需重启 |
| `etc/limits.json` | guard 与工具注册表的路径、Kernel 建 HTTP 服务器的参数 | 需重启 |

---

### 演化

代码直接摆在根目录,不再有 `versions/<id>/` 这层间接,也不再有 `etc/current.json` 指针。
回滚由 Git 承担 —— 代价是它需要人进终端,不像旧的指针回落那样无人值守。

```bash
kill -HUP $(cat run/boot.pid)   # 重启 App(代码改了即生效,Kernel 不动)
```

agent 自己走的是同一条路:改完代码通过 App API 提交重启申请,
人在前端确认,App 再向 Boot 发 `SIGHUP`。

**加一个应用** = 建一个目录:`app/apps/<id>/`,里面放 `ui/meta.ts` 与 `ui/index.tsx`
(需要服务端就再加 `server/api.js`,需要持久事实就用 `_shared/db.js` 开自己的库)。
两侧都是构建期/启动期自动发现,不用改任何现有文件。删掉目录加删掉
`var/apps/<id>.db` 就等于卸载。

---

### 快速开始

需要 Node.js 22+ 和一个兼容 OpenAI Responses API 的模型服务。

```bash
cp etc/env.example.json etc/env.json
# 填写 responsesUrl、apiKey、model(Kernel 的兜底;App 起来后在设置页改即时生效)

cd app && npm install && npm run build && cd -
npm start
```

浏览器打开 <http://127.0.0.1:9523>。

| 命令 | 作用 |
| --- | --- |
| `npm start` | 启动 Boot,拉起 Kernel `:9522` 和 App `:9523` |
| `npm stop` | 通知 Boot 统一关闭 App 和 Kernel |
| `npm run build` | 构建前端到 `app/dist` |
| `kill -HUP $(cat run/boot.pid)` | 重启 App |
| `npm run kernel` | 只启动 Kernel,独立调试 |
| `npm run app` | 只启动 App |
| `npm run cli` | 终端界面 |
| `npm run cli -- run "任务"` | 跑一次就退,正文走 stdout |
| `npm run cli -- --direct` | 逃生通道:绕开 App 直连 Kernel |
| `node bin/hooks/check-boundaries` | 复核应用没越过框架边界 |

`--direct` 不进库、不压缩,所以**它的消耗天然记不上账** —— 这是逃生通道的代价,
不是缺陷,但值得知道。

---

### 安全

这个 agent 能执行命令并修改文件,只在信任的机器上运行,不要暴露到公网。
`var/`、`run/`、`etc/env.json` 已被 Git 忽略。
