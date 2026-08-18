# AIOS 设计

当前仓库采用 **外部 Boot + 无持久状态 Kernel + 有状态 App** 的三进程架构。Boot 只管理服务进程；Kernel 执行一次 run；App 拥有对话、持久化、上下文策略和 UI。

边界判断：宿主进程编排进 Boot；一次模型执行无法外包的机制进 Kernel；持久状态和产品策略进 App/userland。

```text
npm start
   └── boot.js
       ├── kernel/index.js  :9522
       └── app/server/index.js  :9523
```

## Kernel 清单

**Responses API、单次内存工具循环、bash、扩展工具执行、run/stop HTTP API。** Kernel 不拥有 chat，也不启动 App，也不读写对话历史。

## 相对 v2 的变化

- **存储归 App**:`var/aios.db`。App 使用 SQLite 管理事务、约束和分页，选择跨轮上下文并把完整 input 交给 Kernel。
- **status 不持久化**:App 与 Kernel 都只在内存记录当前运行,重启即回到 idle。
- **App 接口读写不对称**:读可走文件,日常写走 App HTTP API(维护 seq、事件与唤醒)；底层文件保留特殊修复能力。
- **服务分离**:Kernel 执行一次 run；App 负责持久状态并调用 Kernel。App 崩溃不损坏磁盘事实，Kernel 重启不需要恢复聊天状态。
- **外部启动器**:根级 `boot.js` 先启动 Kernel，再启动 App；App 崩溃时单独重启，Kernel 崩溃时重启整套系统。
- **CLI 逃生通道**:Console 在 App 正常时使用持久对话，App 损坏时直连 Kernel 使用临时内存上下文。
- **两段事件流**:Kernel 用请求内 SSE 把本轮结果交给 App；App 持久化定稿 item 后,再用自己的 SSE 通知 UI。
- **UI 是 agent 可演化的默认发行物**:React + Vite 源码在 `app/ui`,构建后由 `app/server` 托管；agent 可以自行修改、构建和重启 app。

## 文档

- `2026-08-16.md`:今日架构演进与工作记录
- `boot.md`:启动顺序、PID、重启与停止策略
- `philosophy.md`:设计哲学,以及为什么最小内核在 AI 语境下第一次经济上成立
- `structure.md`:项目目录与实现规模
- `config.md`:环境配置、工具钩子与「该放哪」判据
- `kernel.md`:Kernel 的 run、工具循环与故障语义
- `api.md`:App chats API 与 Kernel run API
- `userland.md`:约定层——子 agent、压缩、记忆、技能、workflow、UI、自我修改
