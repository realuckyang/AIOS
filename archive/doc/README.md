<div align="center">

# AIOS

### 让 AI 成为你的操作系统。

完成你的日常任务,构建紧贴你需求、习惯、爱好的原生应用。
通过 AI 任务系统,让你的应用也可以和 AI 对话。

<br />

[![License: ISC](https://img.shields.io/badge/license-ISC-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A522.5-43853d.svg)](https://nodejs.org)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey.svg)](#-安装)
[![Discord](https://img.shields.io/discord/0?label=Discord&logo=discord&color=5865F2)](https://discord.gg/YfCbV3m9Q)
[![Stars](https://img.shields.io/github/stars/realuckyang/AIOS?style=social)](https://github.com/realuckyang/AIOS)

[简体中文](./README.md) · [English](./README_en.md)

[安装](#-安装) · [第一次使用](#-第一次使用) · [模型](#-支持的模型) · [内置应用](#-内置应用) · [架构](#-架构) · [社区](#-社区)

<img src="https://iimos.ai/blog/iimos-screenshots/images/readme-overview.webp" alt="AIOS Screenshot" width="100%" />

</div>

---

> 要想了解它**为什么是 OS**、**根据是什么**、**能做什么**,以及**你要不要用它**,
> 还是花几分钟,读一读下面的内容。

---

## 🧭 为什么是 OS?

历史上,操作系统的每一次大迭代,都伴随着交互方式的根本变化。**新的交互范式,催生新的 OS。**

现如今,**对话**正成为一种全新的交互范式 —— 自然、无门槛、能一次性表达复杂需求。这一波大模型浪潮,让"和机器说话"从科幻变成日常。

**但,未来只有对话就够了吗?所有应用都消失了,只剩聊天框?**

### 不能。

就算是最简单的「记一条笔记」这件事,如果只有聊天框:

- 滚动几屏,它就被刷走了
- 没法归类,没法置顶
- 没有「笔记应用」这种 app,你甚至想不起来要去记

如果换成一个真正的笔记应用:永远在那里,可以打开;有文件夹、有标签、有置顶;它甚至会主动在桌面上提醒你。

所以,**对话与界面不是替代关系,是相辅相成**。在真正的 AI 操作系统里,图形界面与应用依然不可或缺。

> ✨ **未来不会流于无形,依然会留于物形。**

---

## 🧐 那现有的应用,有什么问题?

问题是 —— **现在这些应用,都不是为你一个人准备的。**

它们是为大众市场准备的,是需求的最大公约数:

- 有广告、有会员、要登录注册
- 更根本的是,**它们都不属于你**
- 你的数据也不在你手里
- 你拥有的只是使用权

从前,软件制作是少数人的技能。这是整个软件行业存在的根本前提 —— 多数人没办法做软件,所以只能用少数人做出来的东西。

而现在,AI 的编码能力越来越强,各大厂商都在疯狂卷的,恰好就是**编码**。这意味着——

> 🛠 **软件构建的门槛正在极大降低。** 每一个普通人,都可以让 AI 替自己构建想要的东西。

---

## 🙋 真的会有很多人做自己的应用吗?

### 会。

也许你一开始不会意识到,但只要**真的试一次**,你就会上瘾。你会被模型气得跳脚,但你仍然会爱上它 —— 因为你喜欢自己构建出东西的感觉。

你会享受这个过程,你的想法会不断显现,你会把你想要的东西**变成现实**。

并且,这不是 Claude Artifacts、灵光闪应用那种**纯前端单页面**:

> 🚀 它是真正的、有前端、有后端、有数据库的**全栈应用**。

---

## 💡 那 Codex / Claude Code 也能写代码,你和它们有什么不同?

从技术原理上讲,没什么不同。

但是现在,缺的不是技术,缺的是**意识、观念、方式** —— 你甚至可以说,缺的是一个**壳**、一个**包装**。

不要小看这层包装。

人类并不生活在原理的世界,而是生活在直观的感受里。**水是 H₂O,但没人喝水的时候会想着这个**;我们活在地球上,但宇宙对大多数人来说,是个非常遥远的东西。

想到「其实」很容易,可是围绕我们生活的,是「其实」**前面**的东西。所以,要记住那句:

> 💫 **Stay foolish.**

让我们想象一下:如果哪一天,OpenAI 出了一台手机 —— 难道上面会只有一个聊天框吗?

我想,大概率不会。**一定会有应用,并且你能够亲手打造应用,应用会和 AI 深度联通。**

---

## 🤖 让 AI 更自然地操作你的应用

现在大多数应用和网页都没有面向 Agent 开发。所以在通用 Agent(Codex / Claude Code / 浏览器自动化工具)的世界里,AI 操作软件只能靠**模拟人**:

```
┌──────────────────────────────┐
│  📸 截屏 → OCR → 找按钮坐标   │   慢、易错、靠模拟
│  🌲 解析 DOM → 找元素        │
│  🖱  鼠标点击 / 键盘输入      │
└──────────────────────────────┘
```

在 AIOS 里就完全不一样:

```
┌──────────────────────────────┐
│  📖 AI 读应用的 APP.md       │   快、准、原生
│  🔧 直接调 API / 函数        │
│  🗄  直接查数据库            │
└──────────────────────────────┘
```

**因为应用本来就是 AI 写的,它当然知道怎么操作自己。** 每个应用都有自己的 `APP.md`,就像 Agent 的 skill 系统里每个 skill 都有 `SKILL.md` 一样。

---

## 💬 让你的应用也可以和 AI 对话

上一节讲的是 AI 怎么操作应用。**但更关键的,是反方向 —— 让应用自己也能去找 AI 帮忙。**

在传统应用里,代码逻辑是固定的:点这个按钮 → 触发这个函数 → 跳到那个页面。

在 AIOS 里,应用可以把意图扔给系统,剩下的让 AI 自己想办法、自己挑工具、自己读历史、自己写完、自己回写数据库。

### 🖋 举个例子:小说写作应用

**传统写法**:开发者要在应用里写死一个「续写一章」的按钮 ——

- 拼提示词
- 调 OpenAI API
- 自己处理流式
- 自己处理错误
- 自己处理重试

如果以后想换模型,整套代码得跟着改。

**AIOS 任务模式**:应用只发起一个活动:「结合前文,写下第 X 章,保持人设和文风」。

**剩下的 AI 自己搞**。你在「任务」应用里能看到它的进度、中间产出、最终结果。

系统提供两种任务模式:`POST /api/activity/create/instant`(同步,适合短任务)和 `POST /api/activity/create/agent`(异步,可调用工具的长任务)。

> **应用不再是死板的 UI,而是一台台能调度 AI 的小机器人。**

---

## 🏪 那应用商店呢?会消失吗?

### 也不会。

即使在 AI 编码时代,人们依然需要**分享** —— 好的灵感、好的提示词、好的设计、好的工作流、好的成品。商店这件事永远有需求。

只是**安装方式**会变。

| 模式 | 传统商店 | AIOS 商店 |
|---|---|---|
| **形态** | 下载 .exe / .apk / .deb | AI 读源码 |
| **结果** | 同一份二进制,所有人长得一样 | 融合进你的系统,适配你的习惯、你的偏好 |
| **性质** | 安装 | **生长** 🌱 |

这里面还有一个变化:**AIOS 商店的应用,都是开源的**。

---

## 🌟 AI 时代的操作系统

这就是 AIOS —— AI 时代应该有 AI 时代的操作系统。

它当然不是传统意义上用来管理硬件的 OS,但它是**产生应用、使用应用、管理应用**的地方。

这样的产品,不能只称它为 App,也不能只称它为网站。

**它就是 OS。**

## 🧠 支持的模型

| 类别 | Provider |
|---|---|
| 主流 | OpenAI · Claude · Gemini · Mistral · xAI |
| 中国 | DeepSeek · Kimi · Qwen · GLM · Z.ai · Stepfun · Minimax · Doubao |
| 聚合 | OpenRouter · Together · Fireworks |
| Coding Plan | GLM-Coding · 阿里云百炼 · 火山方舟 · 腾讯混元 · 京东云 · Kimi-Coding |
| 自定义 | 任意 OpenAI 兼容接口 |

流式输出、Tool Calling、reasoning content 在各家上都通。

---

## 📦 内置应用

AIOS 现在回归框架定位,默认只保留基础系统能力,其他应用由你和 AI 在对话里现场生成。

| 类别 | 应用 |
|---|---|
| **系统** | 对话 · 任务 · 记忆 · 设置 |
| **电脑** | 文件 · 终端 · 系统状态 |
| **运行** | 监视器 |

要更多?点应用面板右上角「**创建应用**」,跟 AI 描述一句需求,30 秒后它真的把新应用写进你的系统里。

---

## 🎯 几个值得一提的细节

### 🚀 一句话写应用

不只是聊天,系统在后台真的会编写 Vue 3 前端 + Node.js 后端 + SQLite 表结构,自己装、自己注册、自己改 bug。

### 🧠 零成本的长对话记忆

对话太长模型会忘前文。常规方案要么 RAG 召回(贵),要么定期跑总结 worker(慢)。

我们的做法是:**让 AI 在每次回答末尾自己写本轮要点**,前端流式过滤器实时剥掉(你看不见),服务端入库。下次对话需要时自动注入回 system prompt。

> **零额外 LLM 调用,零延迟,零后台 worker。**

### 🔒 数据 100% 本地

所有对话、文件、应用代码,全在你电脑上的一个 SQLite 文件 `database/aios.db` 里。断网也能用,关掉浏览器什么都不会上传。

---

## 🚀 安装

### 系统要求

| 项 | 要求 |
|---|---|
| OS | macOS 12+ / 主流 Linux / Windows 10 1809+ |
| Node.js | 22.5+ |
| 端口 | `9502` 主服务 / `9503` 应用服务 / `5173` 开发前端 |
| 磁盘 | ≥ 1 GB |

### 源码运行

```bash
git clone https://github.com/realuckyang/AIOS.git
cd AIOS
npm install
npm run build && npm start
```

生产模式启动后浏览器访问 **`http://localhost:9502`**。

开发模式:
```bash
npm run dev
```

开发模式浏览器访问 **`http://localhost:5173`**。

---

## 🎬 第一次使用

1. **打开浏览器** → 生产模式 `http://localhost:9502`,开发模式 `http://localhost:5173`
2. **设个本机访问密码**(只挡浏览器,不上传)
3. **进「设置 → 模型」**,挑一个 Provider,填 API Key
4. **回到「Chat」**,试试:
   > 「帮我做一个番茄钟,左边大字显示倒计时,右边记录今天完成的几个 25 分钟」

---

## 🏗 架构

```text
AIOS/
├── server/
│   ├── main/           # 主服务 :9502   HTTP / WS / Auth / Chat / Activity / LLM
│   │   ├── api/        # 路由入口
│   │   ├── ai/         # Agent 执行循环 + 工具调用
│   │   ├── llm/        # Provider / Input normalizer / Requester / Output parser
│   │   ├── service/    # Auth / Chat / Activity / Prompt / Runtime / Settings
│   │   └── repository/ # SQLite 数据访问
│   └── apps/           # 应用服务 :9503  各 app 自带后端
├── ui/                # Vue 3 + Vite + Pinia + Tailwind v4 前端
├── apps/               # 每个 app 的 APP.md 与共享资源
└── skills/             # 本地技能
```

**技术栈**:Node.js 22.5+ · Vue 3 · Vite 7 · node:sqlite · Tailwind v4 · ws · node-pty · xterm.js

**数据**:全部在本地单文件 `database/aios.db`,可备份、可迁移、可一键清空。

---

## 🛠 开发与贡献

```bash
git clone https://github.com/realuckyang/AIOS.git
cd AIOS
npm install

npm run dev                    # 开发模式(主服务 + 应用服务 + Vite dev 热更新)
npm run build && npm start     # 生产构建 + 启动
```

提交规范、应用开发约定详见 [CONTRIBUTING.md](./dev/contributions/CONTRIBUTING.md)。欢迎提 Issue 和 PR。

### 仓库同步

AIOS 同步维护两个远端仓库:

- GitHub: `https://github.com/realuckyang/AIOS.git`
- Gitee: `https://gitee.com/realuckyang/aios.git`

维护者发布时应保持两边 `main` 指向同一个提交。提交前先核对 `git status` 和 `git remote -v`;推送时分别推送 `origin main` 和 `gitee main`。

---

## 📚 进一步阅读

关于 AIOS 的产品思考:

- [AIOS——AI 时代的操作系统](https://iimos.ai/blog/aios-open-source-launch)
- [Agent OS kernel + Agent-native Apps = AIOS](https://iimos.ai/blog/agent-os-kernel-and-apps)
- [一切皆命令](https://iimos.ai/blog/everything-is-a-command)
- [你需要的可能不是 OpenClaw,你需要的是 AIOS](https://iimos.ai/blog/not-openclaw-but-aios)
- [软件行业将迎来深刻改变](https://iimos.ai/blog/software-industry-deep-shift)
- [苹果并不知道如何打造 AI 时代的操作系统](https://iimos.ai/blog/apple-misses-ai-os)
- [关于用户不知道做什么应用](https://iimos.ai/blog/users-dont-know-what-to-build)
- [完整哲学版](https://iimos.ai/philosophy) · [更多文章 →](https://iimos.ai/blog)

---

## ❓ FAQ

<details>
<summary><b>端口 9502 / 9503 被占用怎么办?</b></summary>

```bash
AIOS_SERVER_PORT=9601 AIOS_APPS_PORT=9602 npm start
```
</details>

<details>
<summary><b>忘记访问密码?</b></summary>

```bash
sqlite3 database/aios.db "DELETE FROM auth; DELETE FROM sessions;"
```
下次访问会重新引导你设置。
</details>

<details>
<summary><b>数据存在哪?</b></summary>

- 仓库 `database/aios.db`

整个 OS 的状态都在这一个文件里 —— 拷走就能迁移,删掉就能重置。
</details>

<details>
<summary><b>和 Open WebUI / LibreChat / LobeChat 有什么区别?</b></summary>

那些是 **LLM 聊天前端**。AIOS 是带原生应用、Agent 任务系统和"AI 自己写应用"能力的**本地操作系统** —— 对话只是其中一个入口。
</details>

<details>
<summary><b>为什么不用 Electron / Tauri?</b></summary>

就是个 Web 应用 + 两个 Node 进程,浏览器即客户端。你能用任何浏览器、甚至通过 SSH 隧道远程访问。不需要打包成桌面 app。
</details>

---

## 📄 License

[ISC](./LICENSE) © realuckyang

---

## 💬 社区

<div align="center">

[![Discord](https://img.shields.io/badge/Discord-加入社区-5865F2?logo=discord&logoColor=white)](https://discord.gg/YfCbV3m9Q)
[![Issues](https://img.shields.io/badge/反馈-GitHub%20Issues-181717?logo=github&logoColor=white)](https://github.com/realuckyang/AIOS/issues)

有任何想法、bug、AI 原生应用实践都欢迎来聊。

<br />

**未来不会流于无形,依然会留于物形。** 🌱

</div>

---

