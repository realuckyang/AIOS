# v2 设计

内核只保留对应物理现实的东西,约定全部上移到 userland。

Agent = 一个带 bash 的模型,能自由调用框架 API 扩展自己的能力。内核 = 两张表(chats、items)、一个工具(bash)、一套 API、一条 SSE、一条运行规则(消息即运行)、一个遗忘原语(上下文指针)、一行状态注入(水位)。配置在库外。

相对 v1 移除:calls 表与服务、compactions 表与压缩调度、origin/parent、`/calls` 路由、专用压缩水位设置、左右分栏 UI。子 agent、回写、监控、压缩策略、记忆、技能、workflow、自我修改全部成为 userland 约定。

- `kernel.md`:设计哲学与内核定义
- `schema.sql`:两张表
- `api.md`:HTTP API 与 SSE
- `userland.md`:约定层(子 agent、压缩、记忆、技能、workflow……)
- `ui.md`:对话浏览器
