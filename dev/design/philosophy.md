# 设计哲学

## 一条判断标准

**Kernel 只保留一次执行无法外包的机制；持久状态和产品策略全部放到 App。**

模型请求、工具循环、工具子进程生死、超时和 run stop 必须发生在执行引擎里，所以属于 Kernel。Kernel/App 两个服务如何启动、重启和统一退出属于宿主进程编排，所以放在外部 Boot。对话如何存、哪些历史进入下一轮、消息如何排队、界面如何展示，都是可以替换的产品策略，所以属于 App。

这不是权限边界。系统默认给 agent 完整 bash 与文件能力，不先猜测风险并堆限制。App API 是维护 seq、事件和调度的常规协调路径；`var/` 仍是开放文件，特殊修复可以直接操作。等真实失败出现，再增加针对性的最小机制。

## Agent 的定义

Agent = 一个带 bash 的模型，能够调用 App API、读写文件、创建程序，并通过 `etc/tools.json` 给下一次 run 增加工具。

运行闭环由三部分共同构成：

- Boot 提供服务启动、监控和统一停止。
- App 提供持久对话、消息调度和跨轮上下文。
- Kernel 提供模型执行、工具调用和触达本机世界的 bash。

提示词、配置、工具、UI 和数据都以普通文件存在，因此 agent 原理上可以扩展和修改自己。Kernel 无需为每种新能力增加专用接口。

## 为什么分成 Kernel 与 App

Kernel 更像一颗只执行当前工作集的 CPU，App 更像状态与调度服务，Boot 则是宿主 supervisor：

- Kernel 接收完整 input，执行一个 run，流式交回定稿 item，然后忘记。
- App 把 `var/aios.db` 中的事实选成 input，调用 Kernel，持久化结果并通知 UI。
- Boot 先启动 Kernel、确认就绪后启动 App，并根据退出对象选择局部或整栈重启。
- `run/` 只放 `boot.pid` 等可丢弃状态；重启后不做“恢复 running”。
- Kernel 请求内 SSE 是执行结果通道；App SSE 是产品事件通道。两者职责不同。

这种切法让 Kernel 不必理解 chat、title、seq、SQLite 或 `context_start`，更容易保持稳定；也让存储格式、压缩策略、搜索索引和调度方式可以只改 App。

## Userland

`app/`、`bin/`、`etc/tools.json` 以及 agent 后续创建的脚本共同构成 userland。这里的 userland 是“内核外的可演化程序”，不是必须存在一个同名目录。根级 Boot 位于 Kernel 与 userland 之外，只负责宿主进程编排。

- `app/server` 是发行版的状态与调度实现。
- `app/ui` 是可替换的桌面。
- `bin/guard` 是 Kernel 咨询的策略钩子。
- `bin/read`、`write`、`edit` 是出厂便利，不是不可替换的内核能力。

子 agent、压缩、记忆、workflow、推荐后续和回答后钩子都可以先作为 App 或脚本约定生长；只有它们确实需要新的不可外包执行机制时，才修改 Kernel。

## 逃生通道

浏览器或 UI 构建损坏时，`npm run console` 仍可连接 App 对话。App 服务也不可用时，console 自动直连 Kernel，历史只保存在当前 CLI 进程内存中；它足以让人命令 agent 检查并修复 App，同时不要求 Kernel 持久化数据。

## 演化方向

- Kernel 追求稳定、少状态、少概念。
- App 和 userland 追求生长，可以按真实使用反馈快速变化。
- `var/` 保存产品事实，`run/` 保存可丢弃现实，`etc/` 保存部署环境。

这套架构的价值不是“像 Linux”，而是让每一层只承担它真正需要知道的事情。
