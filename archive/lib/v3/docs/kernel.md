# 内核

内核是一个独立进程:冻结、人写、agent 不可改。它的全部构成:

- **data 目录**(meta.json + items.jsonl,唯一写者)
- **消息即运行**(调度)
- **bash**(执行边界)
- **HTTP API**(唯一写入口)
- **SSE**(事件通知)
- **上下文指针**(遗忘原语)
- **水位注入**(资源计量)
- **CLI console**(tty 逃生通道)
- **init**(拉起 userland 进程)

配置(模型服务地址、密钥、模型名、固定指令、init 命令)是环境,不是数据,放在库外的配置文件里。

## 双进程与故障语义

```text
kernel 进程(冻结)                 userland 进程(agent 可写、可炸)
  data/ 唯一写者                     默认对话浏览器 UI
  run loop · bash · API · SSE        agent 现写的服务端逻辑
  console · init                     SQL 索引 · 仪表盘 · CLI 糖
```

一旦 UI 长出服务端逻辑,而这些代码是 agent 可改写的,让它们跑在内核进程里就等于允许用户态代码把内核 panic 掉。所以进程隔离:

- **userland 崩**:UI 没了,但对话还在跑(run loop 在内核里)、CLI console 随时可用、数据无损;init 带退避重启,秒级拉回。
- **kernel 崩**:一切停止,但真相在磁盘上;人类重启即可。status 不持久化,起来就是干净的 idle 世界。

两种死法都有明确的、无损的恢复路径。

## 存储

```text
data/chats/<chat-id>/
├── meta.json      # title、description、context_start、created_at、updated_at
└── items.jsonl    # 一行一条:{seq, source, item, usage, at}
```

- **内核本体论只有两个概念**:对话(chat:身份、上下文指针;对应进程)和消息(item:标准 Responses API item + source;对应进程地址空间里的一页)。
- **单写者**:内核进程是 data/ 的唯一写者。userland 和 agent 读走文件,写走 API。
- **status 不持久化**:「正在运行」是内核进程内存里的事实,进程死了它自然消失。持久层里只有真正持久的东西。
- `seq` 为对话内递增;上下文指针指向 seq。
- `source` 只有四个值,无默认值,写入必须显式指定:`user`(人)、`runtime`(对话之间、脚本回传)、`model`(模型定稿)、`tool`(bash 结果)。
- meta.json 更新用 temp + rename 保原子;items.jsonl 追加写,崩溃最多脏最后一行,读取时跳过。
- items 永不因压缩而删除:持久历史是观测和审计的真相,只是不再进模型输入。

选 JSONL 而非数据库的理由:与 bash 天然同构(agent 用 cat/grep/jq 直读自己的历史,内核真相落在 agent 的工具射程内);人类逃生通道从「会用 sqlite」降到「会开文本编辑器」;内核零依赖;append 一行是最接近物理现实的持久化原语。

## 消息即运行

写入消息立即返回;对话空闲则后台自动运行。这是内核唯一的唤醒原语,也是内核异步性的唯一来源:

- 人发消息、agent 派生对话、子对话回传、后台脚本通知、定时唤醒——全部是同一个动作:往某条对话发消息。
- 不提供 start、resume、background 参数。进程级异步交给 shell 自身(`setsid ... &`)。
- 同一对话不并发运行。停止不删除对话、历史或已产生的修改。

## 事件:内核生产,userland 消费

内核对内只有一个入口、对外有两个出口,且对消费方一无所知:

```text
            ┌──────── kernel ────────┐
  写(唯一入口)                        读(两个出口)
  HTTP API  ──→                 ──→  文件(事实,pull,持久)
                                ──→  SSE(通知,push,易逝)
            └────────────────────────┘
              单向:userland 认识 kernel,kernel 不认识 userland
```

- **抛出是 fire-and-forget 的**:零个订阅者时内核照常运转;userland 崩了,事件丢了就丢了——事件不是事实,文件才是。补不齐发 gap,消费方回到文件全量重拉。「通知易逝、事实持久」的分工,是内核敢对消费方一无所知的原因。
- **消费方是 userland 服务**:UI 做实时渲染,索引服务做 SQL 读模型的增量灌入,watcher 面板亮红灯——同一条事件流派生各自的视图。
- **agent 不订阅 SSE**:agent 的「事件」就是被消息唤醒本身。人被动看(SSE),agent 被动跑(唤醒),两者消费内核的方式不同但都是下游。
- 依赖严格单向:kernel 的代码里没有一行提到任何 userland 造物。唯一例外是 init spawn userland 进程——那是进程管理,不是通信;拉起的命令是配置,内核仍不知道它是什么。

四条通道各干一件事,全部单向:**写入靠 syscall(API),事实靠文件,通知靠事件,调度靠唤醒**。

## 遗忘与水位

模型无法不吃已经喂给它的东西,所以「执行遗忘」出不了内核,但它蠢到只剩一个指针:

- `meta.json` 的 `context_start`:input 组装时只取该 seq 之后的 items。
- 内核每轮把当前 token 用量作为状态注入模型输入(类似 /proc)。这是观测机制,不是策略。

压缩的感知、时机、摘要生成全部在 userland(见 userland.md)。

**已知空位(OOM)**:模型失手导致 input 超窗时,请求失败且对话失去自救能力。可在内核留最粗暴的兜底(超长失败时自动前移指针重试一次)。当前不实现,由人工拨指针恢复。

## Bash

模型的默认工具,内核内建、不需要声明。文件读写、系统命令、调框架 API、派生对话、后台任务,全部通过 shell 完成。加「新工具」的正道是 userland 加一个 CLI(新能力 = 新命令,不是新 syscall);bash 覆盖不了的剩余场景(多模态输出、强 schema、服务端工具)由工具分发钩子承接——`userland/tools.json` 声明,`kernel/tools.js` 按 name 分发到 exec 或原样透传给服务端,详见 config.md。bash 负责:

- 启动 shell 子进程,设置工作目录与超时
- 对话停止时终止进程组(setsid 逃逸的后台进程刻意不在此列,由约定管理)
- 截断过长输出,将退出码与输出返回模型
- **guard 钩子**:执行前调用配置指定的可执行文件,exit 0 放行、非 0 拒绝。机制在内核,策略在 userland——「哪些命令算灾难」是判断不是物理现实,所以模式不进内核。默认发行的策略脚本在 `userland/bin/guard`(拦根目录递归删除、格盘、fork bomb 等字面),agent 可改,人类可换可移除。guard 自身不可执行时放行并警告:它是灾难刹车,不是安全边界。OS 对应:LSM/seccomp 钩子在内核、策略用户态装载;`rm` 的 `--preserve-root` 保护本来就在 userland 工具里,Unix 内核从不拦 syscall 字面。

## CLI console

内核二进制自带一个子命令(如 `agent console [chat-id]`):附着到一条对话,一行进、流式答案出,工具活动一行简讯带过。不做 TUI、不做花活——它的美德就是简陋,简陋意味着永远不会坏。

- **它是 tty**:只依赖终端,不依赖浏览器、静态文件或任何 userland 造物;而「人类有个终端」正是内核能被启动的前提。依赖链最短的逃生通道才是真逃生通道。
- **它能写**:userland 废了的时候,人类最需要做的事是告诉 agent「去把 userland 修好」。逃生通道因此不只是观测窗口,而是自修复通道——userland 崩溃从事故降级为一句话能恢复的状态。
- **它不是第二个写入口**:CLI 是内核 API 的一个客户端,行输入 POST `source=user`,输出读文件或 SSE。单写者与人机平权无损。它与 agent 自写的 libc 包装是同类,区别只在:这一个由人写、随内核发行、agent 不可改、永不损坏。
- **创世路径**:有了可写的 CLI,第一次 boot 可以没有任何 userland——内核 + 终端,人对 agent 说「给自己造一个 UI」,agent 写出 userland,init 拉起。默认发行的 UI 从必需品降格为出厂便利:kernel 是人类给的,userland 全部可以是 agent 长出来的。

## Init

内核启动后 spawn 配置中指定的 userland 命令,退出时带退避地重启。拉起谁、userland 里跑什么是配置(策略),spawn 与重启是机制。init 列表天然支持将来多个 userland 服务:加一行而已。

agent 升级 UI 的方式:改完代码,kill 掉 userland 进程,init 拉起新版——agent 给自己做无停机升级,内核全程只履行 init 的职责。

## 人机平权

UI、agent、人类使用同一套 API 和同一批文件。人类始终能直接改配置文件和 data/ 下的文件,这是自我修改(userland.md)的最终逃生通道。
