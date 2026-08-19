# Userland

Userland 是 Kernel 外所有可演化程序的统称。当前发行版没有 `userland/` 目录；它具体落在 `app/`、`bin/`、`etc/tools.json` 以及 agent 自己创建的脚本中。

App 是默认的有状态 userland：它通过 App API 协调 `var/aios.db`，选择跨轮上下文，调用 Kernel，并向 UI 发布事件。Kernel 不认识这些产品概念。

App 的服务进程由根级 Boot 启动和监控；这只是宿主进程管理关系，不使 App 成为 Kernel 的一部分。

## 子 agent

“子 agent”可以只是另一条 App 对话，父子关系写在任务内容或 `description` 约定里，无需进入 Kernel schema。

- `POST /api/chats` 创建 worker，并在首条 runtime 消息中写任务和回传地址。
- worker 完成后向父对话的 `/messages` 回写结果。
- 继续调用已有 worker 就是再发消息。
- 是否删除 worker 由创建者决定。

## 长任务与通知自己

唤醒原语是向 App 对话发消息。需要超过单次 bash 超时的任务，可以脱离当前进程组运行，并在完成后调用 App API：

```bash
setsid sh -c 'make build > build.log 2>&1; curl -s -X POST "$API/chats/$SELF/messages" \
  -H "content-type: application/json" \
  -d "{\"content\":\"构建结束，日志在 build.log\",\"source\":\"runtime\"}"' &
```

脱离的后台进程会刻意活过当前 run；PID、日志和清理由脚本自己管理。`setsid` 是 Linux 命令；macOS 可用能调用 `setsid(2)` 的小程序实现同样效果。

## 压缩与记忆

上下文窗口是现实，但压缩时机和方法是策略，因此由 agent 与 App 协作：

1. Kernel 状态行报告上次 token 用量。
2. agent 通过 App API 或 SQLite 读取对话 items，生成摘要或把细节落到文件。
3. agent 通过 App API 写入摘要，并更新该 chat 的 `context_start`。
4. App 在下一次 run 只选择指针之后的历史。

记忆和 workflow 同样先用目录、文本约定和脚本实现。需要搜索或派生索引时由 App 在 SQLite 中扩展，不把查询结构塞进 Kernel。

## Skills

Skills 位于仓库根级 `skills/<name>/`，每个 Skill 至少包含带 `name` 和 `description` frontmatter 的 `SKILL.md`，可选用 `agents/openai.yaml` 提供列表展示元数据。App 负责扫描、展示和未来的选择/注入策略；Kernel 不读取 Skill 目录，也不理解 Skill 概念。

## 回答完成后的扩展

“推荐后续”“匹配回答中的命令串并执行”等需求属于 App 策略。App 已经接收 Kernel 的定稿 item，可以在持久化后调用 `bin/` 程序、发布新事件或追加 runtime 消息。实现这些能力不需要 Kernel 理解具体正则和业务规则。

如果未来所有调用方都需要一个不可绕过的通用生命周期信号，再考虑给 Kernel 增加最小事件；在真实需求出现前，不预装复杂钩子系统。

## UI 与 console

`app/ui` 是默认桌面，源码可修改、替换或删除。开发服务器把 `/api` 代理到 App，不是 Kernel。

`npm run console` 不依赖浏览器或 UI 构建：

- App 正常时，它连接持久对话。
- App 不可用时，它直连 Kernel，使用 CLI 内存中的临时历史作为修复通道。

## 自我修改

App 修改需重启时，agent 只能创建 `/api/system/restarts` 申请，不能越过用户确认直接重启。正常路径由 App 请求 Boot 重启，Kernel 不参与；只有前端检测到新 App 实例未在时限内恢复时，才直连 Kernel run API 请求自愈。

agent 可以修改 `etc/instructions.md`、`etc/tools.json`、App、UI 和脚本。配置与提示词改坏后可能影响所有后续 run，因此修改前保留 git 提交或备份。`var/` 日常写入优先走 App API；确需直接修复 SQLite 时通常先停止系统，避免和 App 事务并发。
