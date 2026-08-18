# AIOS

由 AI 驱动的操作系统。你用自然语言向计算机发出指示,agent 替你执行、为你构建;
界面、应用、乃至 agent 自己的工具,都在使用中被塑造。

---

### 理念

**壳与应用都可塑,系统只有一根不可变的脊柱。**

- **壳是 userland。** 对话管理、持久化、上下文策略、界面,都运行在内核之上、
  都可以被改写。要不要应用、应用长什么样、甚至要不要这套对话界面,都是可变项。
- **工具自扩展。** agent 的工具不是出厂写死的清单:`etc/tools.json` 是注册表,
  `bin/` 下是可执行程序,agent 可以为自己编写新工具并注册进来。
- **调用方式全面开放。** agent 可以递归调用自己,外部程序可以直接走 API,
  也可以写脚本把多次调用编排成程序化流程 —— 任何东西调用任何东西。

自我改写要改得安全,前提是有些东西绝对不变:

- **Boot 在系统之外**,只管拉起和看护进程,任何自我改写都碰不到它;
- **Kernel 无持久状态**,只执行一次 run,崩了重启即回到干净态;
- **guard 与出厂 `bin/` 工具**独立于被进化的部分,是逃生通道的地板;
- **Console 可直连 Kernel**,App 被改坏时仍有一条不依赖 App 的路进去修。

对话擅长表达意图,不擅长承载结果 —— 形态即是功能,形态就是价值。
所以进化的产出应当凝固成稳定的形态:应用、界面、可复用的工具,
而不是永远保持液态。衡量这个系统的标准只有一条:**能否更快地长出更好的形态。**

---

### 架构

```text
npm start
   └── boot.js                 外部启动器,看护与重启
       ├── kernel/index.js     :9522  无持久状态,单次 run 的模型工具循环
       └── app/server/index.js :9523  有状态,对话/SQLite/上下文策略/UI
```

边界判断:宿主进程编排进 Boot;一次模型执行无法外包的机制进 Kernel;
持久状态和产品策略进 App/userland。

- **Kernel**:Responses API、内存工具循环、bash、扩展工具执行、run/stop HTTP API。
  不拥有 chat,不启动 App,不读写对话历史。
- **App**:拥有对话与持久事实(`var/aios.db`),选择跨轮上下文,把完整 input 交给
  Kernel。App 崩溃不损坏磁盘事实,Kernel 崩溃不需要恢复聊天状态。

详细设计见 [`dev/design/`](dev/design/README.md)。

---

### 快速开始

需要 Node.js 22+ 和一个兼容 OpenAI Responses API 的模型服务。

```bash
cp etc/config.example.json etc/config.json
# 填写 responsesUrl、apiKey、model

cd app/ui && npm install && npm run build && cd ../..
npm start
```

浏览器打开 <http://127.0.0.1:9523>,或 `npm run console` 走终端。

| 命令 | 作用 |
| --- | --- |
| `npm start` | 启动 Boot,由它依次拉起 Kernel `:9522` 和 App `:9523` |
| `npm stop` | 通知 Boot 统一关闭 App 和 Kernel |
| `npm run kernel` | 只启动 Kernel,独立调试 |
| `npm run app` | 只启动 App |
| `npm run console -- [chat-id]` | 终端对话客户端 |

**安全**:这个 agent 能执行命令并修改文件,只在信任的机器上运行,不要暴露到公网。
`var/`、`run/`、`etc/config.json` 已被 Git 忽略。

---

### 资料

`dev/` 是存档区:项目的历史、设计文档与历代版本都在这里。文档一经归档**原样保留**,
与现状不符时在文首加存档说明,不改写正文 —— 历史不重写,只做标记。

| 目录 | 内容 |
| --- | --- |
| [`dev/design/`](dev/design) | 设计文档 |
| [`dev/timeline/`](dev/timeline) | 大事记(每次重大变更一篇,含仓库快照存档) |
| [`dev/doc/`](dev/doc) | 理念与文章 |
| [`dev/lib/`](dev/lib) | 历代版本 |
| [`dev/contributions/`](dev/contributions) · [`dev/demos/`](dev/demos) · [`dev/industry-news/`](dev/industry-news) | 贡献、演示与行业动态 |
