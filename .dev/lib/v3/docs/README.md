# v3 设计

v3 是 v2 思想的完成态:**kernel + userland 双层架构,双进程隔离,内核彻底冻结,userland 由 AI 书写**。这就是 AIOS——不是「AI 跑在 OS 上」,而是「OS 的 userland 由 AI 书写」。

判断标准只有一条:一个东西背后有物理现实(上下文窗口、进程生死、人类必须能观测)就进 kernel;背后只有约定,就上 userland。

## 内核清单

**data 目录(唯一写者)、消息即运行、bash、HTTP API、SSE、上下文指针、水位注入、CLI console、init。** 再无其他。

## 相对 v2 的变化

- **存储从 SQLite 换成文件系统 JSONL**:`data/chats/<id>/meta.json + items.jsonl`。表没有了,库没有了,内核零依赖。SQL 降级为 userland 按需派生的索引。
- **status 不再持久化**:「正在运行」是内核进程内存里的事实,重启即空,恢复规则被整个删除。
- **接口分裂为读写不对称**:读走文件(cat/grep/jq 直读),写走 HTTP API(唯一写入口,承载唤醒语义)。
- **双进程**:kernel 一个进程(冻结、人写、agent 不可改),userland 一个进程(agent 可写、可重启、可炸)。UI——包括默认对话浏览器——从内核搬进 userland 服务。
- **内核新增两个机制**:CLI console(tty,一问一答的终端逃生通道,活过 userland 崩溃,可用来命令 agent 修复 userland)和 init(PID 1,拉起并带退避重启 userland 服务)。
- **内核是事件生产者,userland 是消费者**:写入靠 API,事实靠文件,通知靠 SSE(fire-and-forget,事件易逝、事实持久),调度靠唤醒;依赖严格单向,kernel 不认识任何 userland 造物。
- **UI 是 agent 可演化的默认发行物**:buildless,agent 改完自己 kill userland,init 拉起新版——自己给自己做无停机升级。

## 文档

- `philosophy.md`:设计哲学,以及为什么最小内核在 AI 语境下第一次经济上成立
- `structure.md`:项目目录与实现规模
- `config.md`:库外配置的四类清单、钩子形状与「该放哪」判据
- `kernel.md`:内核定义、存储、调度、故障语义
- `api.md`:读写不对称的内核接口
- `userland.md`:约定层——子 agent、压缩、记忆、技能、workflow、UI、自我修改
