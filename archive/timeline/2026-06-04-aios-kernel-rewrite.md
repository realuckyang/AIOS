# 2026-06-04 · AIOS 内核重写(基于 AGENT 干净内核)

> 一次以「干净内核」为基准的 AIOS 重写。起因:旧 AIOS 的 UI 与组织方式被反复改动后变乱,维护痛苦。
> 决定:拿 AGENT(从 AIOS 抽出的纯内核,React 技术栈)当基准,把 AIOS 的架构理念重新接进来,
> 砍掉冗余,只保留核心 + 三个全新样板应用。

## 一句话

`AGENT 干净内核` + `AIOS 的 system | apps 架构` = 新 AIOS(仓库:`agent-aios`)。

---

## 架构落点

### 双服务(对齐 AIOS 端口)
```
主服务  :9502   系统内核 — chat / tasks / memories / skills / settings + ai + monitors + 托管 GUI
应用服务 :9503   应用后端 — 每个 app 自带后端 + 独立 SQLite 库
```
- 两个服务同进程启动(`index.ts` 先 `startServer` 再 `startAppsServer`),端口/API 仍是分开的两套。
- 生产:主服务把 `/apps/*` 反代到 9503;开发:Vite 代理 `/apps → 9503`、`/api → 9502`。

### 目录主轴:system | apps(server 与 ui 对称)
```
server/                       ui/src/
  system/   系统服务(内核)      system/   系统侧(外壳 + 内置功能 + 状态 + api)
    ai/     无状态执行器          components/ state/ lib/ views/ api.ts
    ai/llm/ 多 provider 流式      apps/     应用侧
    api/ services/ repository/   apps/     应用侧(notepad/todo/ledger + registry + lib)
    runtime/ + index.ts
  apps/     应用服务
    _shared/ notepad/ todo/ ledger/
```

### 工作区(5 个,精简)
对话 / 任务 / 记忆 / 技能 / 设置。其下是「应用」分组(数据驱动注册表,`#/app/:id`,动态加载),
带 `+` 进入「创建应用」引导页。

### 应用(三个全新手写样板)
- **记事本 notepad**:flomo 结构(顶部输入 + 下方笔记流,行内编辑)
- **待办 todo**:加/勾选/删,未完成置顶
- **记账本 ledger**:收入/支出流水 + 自动汇总
- 每个 app 五件套:独立后端(`server/apps/<id>`,`{name,match,handleApi,initDb}` 契约)+ 独立库(`database/apps/<id>.db`)+ React 前端(`ui/src/apps/<id>`)+ 前后端各一行 registry + `apps/<id>/APP.md`。

---

## 关键决策

- **监视器(monitor)保留为「对话间传递通道」**:不再当任务专属回调;后端机制 + 表 + 任务回传全留,仅去掉导航/浏览界面。事件 → 投递 `[MONITOR]` 消息进目标会话 → 唤醒其 AI。实测投递链路通过。
- **应用生成不做流水线**:就是 AI 用 shell 按预置指南(`skills/create-app/SKILL.md`)自己建;`+` 引导页会开一个对话并让 AI 照指南建 app。
- **多 provider 流式 LLM**(从 AIOS 港入 `server/system/ai/llm/`):common(provider 感知头)+ stream(SSE 解析)+ parsers(openai/deepseek/kimi/gemini)。agent 循环改流式 emit delta → WS `delta` → 前端流式气泡。设置加 `provider` 选择。单测覆盖 content 增量 / tool_calls 增量重组 / usage。
- **prompt 对齐 AIOS**:新增「应用目录」段(注入各 APP.md 摘要)、tools 段补「后台任务 + 监视器」用法(按本仓真实 `/api/tasks` + monitor)、默认指令补严(不编造 / 风险确认)。`<summary>` 会话摘要保留。
- **砍掉**:目标(objectives)+ 心跳、便签(memos)+ `<memo>`/remarks 长程记忆机制(前后端 + 表)。

## 保留 / 不要

- 保留:AIOS 的 `dev/` 目录(doc / contributions / demos / industry-news / timeline)。
- 不要:鉴权层、电脑类 app(文件/终端/系统状态)、instant 同步任务、appContext(QuickChat)。

## 状态

- `tsc --noEmit` 通过;`vite build` 通过;双服务启动无报错;流式 / 监视器投递 / 三 app CRUD 均实测通过。
- 待办(覆盖旧 AIOS 前):完善 README、完善 AGENTS.md。

## 技术栈

Node 22+(`node:sqlite`)· TypeScript · React 19 · Vite · Tailwind v4 · ws · 单一 `shell` 工具 · OpenAI 兼容 + 流式多 provider。
