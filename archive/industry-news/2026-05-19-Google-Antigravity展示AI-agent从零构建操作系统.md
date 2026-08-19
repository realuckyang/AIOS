# Google Antigravity 展示 AI agent 从零构建操作系统

日期：2026-05-19

## 简报

Google 在 I/O 2026 期间发布 Gemini 3.5 Flash，并更新 Antigravity 2.0。官方把 Antigravity 定位为 agent-first 开发平台，支持多个 agents 并行执行任务，也提供桌面应用、CLI、SDK，以及托管在 Gemini API 里的 Managed Agents。

最值得关注的是 Antigravity 的一场操作系统演示：Google 用 Gemini 3.5 Flash 从一个高层 prompt 出发，让 93 个 subagents 协作构建一个可运行的简易操作系统。官方披露这次任务调用模型 15,314 次，输入 token 超过 339M，算上缓存、输出和 thinking 后总量超过 2.6B，按 API 价格约 916.92 美元。这个系统已经能运行 Doom。

Google 同时强调，这不是现代完整操作系统。它缺少浮点数学、硬件加速、复杂多线程、沙箱、JIT、复杂音视频解码等能力，代码质量也不能和资深工程师长期打磨的系统相比。

## 锐评

Google 这次最有意思的地方，是它让 AI 去写一个操作系统。但这也暴露了关键差别：Antigravity 仍然站在传统软件工程里，用 AI 改造开发流程；AIOS 要做的不是让 AI 更快地开发旧世界的软件，而是基于 AI 重新思考什么才是 AI 时代的操作系统。

操作系统的每一次大迭代，都伴随着交互方式的根本变化。AI 带来的新交互不是只有聊天框，而是对话与图形界面重新结合：人用自然语言表达复杂需求，系统生成真正有前端、有后端、有数据库的应用；这些应用不是孤立工具，而是能被 AI 原生理解、调用和修改的系统组成部分。

这才是 AIOS 和 Antigravity 的分野。Antigravity 是让 AI 帮开发者写软件，AIOS 是让普通人拥有自己的软件系统。AIOS 里的应用本来就是 AI 写的，所以它不需要靠截图、OCR、DOM 和坐标去模拟人类操作，而是可以读 APP.md、调 API、查数据库，直接理解和操作自己。反过来，应用也可以向系统发起 AI 任务，把复杂意图交给系统处理。

所以 AIOS 不是另一个 coding agent，也不是应用生成器。它是让 AI 产生应用、使用应用、管理应用的地方。Google 展示了 AI 可以写出一个 OS；AIOS 真正关心的是，既然 AI 已经能写软件，那么操作系统、应用和应用商店都应该如何重新生长。
