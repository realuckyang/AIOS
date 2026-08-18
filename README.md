# AIOS

由 AI 驱动的操作系统。你用自然语言向计算机发出指示,agent 替你执行、为你构建;
系统本身 —— 界面、应用、乃至 agent 自己的工具 —— 都在使用中被塑造和进化。

---

### 从「加应用」到「自进化」

上一代 AIOS 的答案是:**在不可变的系统壳里加应用**。对话不能替代界面,人们需要
具体的功能形态,于是用户说话,AI 造应用 —— 系统围绕应用展开(那一版的宣言存档于
[`dev/doc/README-应用时代宣言.md`](dev/doc/README-应用时代宣言.md),其中「形态即价值」的判断依然成立)。

这一代把同一条公理往下推了一层:**壳与应用都可塑,只留一根不可变的脊柱。**

- **壳也是 userland。** 对话管理、持久化、上下文策略、界面,都运行在内核之上、
  都可以被改写。要不要应用、应用长什么样、甚至要不要这套对话界面,都是可变项。
- **工具自扩展。** agent 的工具不是出厂写死的清单:`etc/tools.json` 是注册表,
  `bin/` 下是可执行程序,agent 可以为自己编写新工具并注册进来。
- **调用方式全面开放。** agent 可以递归调用自己,外部程序可以直接走 API,
  也可以写脚本把多次调用编排成程序化流程 —— 任何东西调用任何东西。

自进化的前提,是想清楚**为了改得安全,什么绝对不能改**:

- **Boot 在系统之外**,只管拉起和看护进程,任何自我改写都碰不到它;
- **Kernel 无持久状态**,只执行一次 run,崩了重启即回到干净态;
- **guard 与出厂 `bin/` 工具**独立于被进化的部分,是逃生通道的地板;
- **Console 可直连 Kernel**,App 被改坏时仍有一条不依赖 App 的路进去修。

旧命题定义往哪里去 —— 进化的产出应当凝固成稳定的形态;新命题定义怎么去。
检验标准只有一条:**是否更快地长出更好的形态。**

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

详细设计见 [`dev/design/`](dev/design/README.md);历代版本与史料见下方「资料」。

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

`dev/` 是本项目的存档区:文档一经归档**原样保留**,与现状不符时在文首加存档说明,
不改写正文 —— 历史不重写,只做标记。

| 目录 | 内容 |
| --- | --- |
| [`dev/doc/`](dev/doc) | 理念与文章(含旧版宣言存档) |
| [`dev/design/`](dev/design) | v4 设计文档 |
| [`dev/lib/`](dev/lib) | v1–v3 历史版本 |
| [`dev/timeline/`](dev/timeline) | 大事记(每次重大变更一篇) |
| [`dev/contributions/`](dev/contributions) · [`dev/demos/`](dev/demos) · [`dev/industry-news/`](dev/industry-news) | 贡献、演示与行业动态 |
