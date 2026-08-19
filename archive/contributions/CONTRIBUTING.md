# 参与 AIOS

欢迎 — 不管你是来修一个 typo,还是来加一个新 app,都很高兴你愿意花时间。

这份文档说明 AIOS 接收哪些贡献、怎么开发、怎么提 PR。如果你只是来用的,不需要读;来贡献代码再来。

---

## 我们最欢迎的贡献

按优先级:

1. **新增内置应用** — AIOS 的核心场景就是"专属应用",这是最有价值的 PR 类型
2. **新增 / 修复 LLM Provider 适配** — 国产模型、聚合平台、自定义接口
3. **Bug 修复** — 任何带复现步骤的 bug 都欢迎
4. **文档与翻译** — README、应用 `APP.md`、英文版、错别字
5. **性能 / 体验改进** — 启动速度、首屏渲染、内存占用

## 暂时不接收的方向

为了让项目能稳步推进,以下 PR 大概率不会合并,提之前请先开 Issue 讨论:

- 把核心从 Node 改成其他语言 / Runtime
- 引入重型依赖(Electron、Docker 必需化、新数据库引擎)
- 大规模重构现有架构
- 给已废弃的桌面窗口模式加功能
- 数据库 schema 写 `ALTER` 兼容补丁(AIOS 早期不维护历史 schema,直接维护干净的当前 schema)

---

## 开发环境

### 准备

- Node.js **20+**
- macOS / Linux / Windows(Windows 建议 WSL)
- 一个任意 LLM Provider 的 API Key 用来自测

### 起服务

```bash
git clone https://github.com/<你的用户名>/AIOS.git
cd AIOS
npm install
npm run dev
```

`npm run dev` 会同时拉起:

- 主服务 `:9502`
- 应用服务 `:9503`
- Vite dev server `:5173`(GUI 改动热更新)

打开 `http://localhost:5173` 开发,改后端代码需要手动重启对应进程。

### 数据存哪

本地 SQLite,默认 `database/aios.db`。开发期想清干净:

```bash
rm -rf database/aios.db .aios
```

---

## 提交一个新 App

这是 AIOS 最常见的 PR 类型。一个最小 app 涉及:

```
ui/src/apps/<your-app>/
  index.vue            # 入口组件
server/apps/<your-app>/   # 可选,如果需要后端
apps/<your-app>/APP.md    # 描述这个 app 是什么
```

最后在 `ui/src/apps.js` 注册:

```js
{
  id: 'your-app',
  name: '你的应用',
  icon: 'material_icon_name',   // Material Symbols 名
  color: '#xxxxxx',              // 主题色
  hasDrawer: false,              // 是否需要左侧抽屉
  load: () => import('./apps/your-app/index.vue')
}
```

### App 的质量门槛

为了让 24+ 个应用看起来像同一个系统,而不是 24 个独立项目,新 app 需要:

- 用 Material Symbols 图标,不要换图标库
- 主题色用单色,不要渐变 / logo 拼贴
- 复用 `ui/src/apps/_shared/` 里的通用组件(头部栏、空状态、loading)
- 字号 / 圆角 / 间距跟随现有 app,不另起一套设计语言
- 数据走 `server/apps/<app>/` 自带后端,不直接在 `server/main/` 加业务路由

不确定的话,先开 Issue 描述你想加的 app(目标用户、核心场景、一张草图),我们对齐后再写。

### 文案怎么处理

AIOS 源码直接使用中文文案。写新 app 时不要引入多语言库,也不要添加语言 token 或翻译 JSON。

---

## 新增 LLM Provider

Provider 适配在 `server/main/llm/`,管线是 **input → requester → output**。

参考 `server/main/llm/README.md`。最小改动:

1. 在 `providers.js` 注册新 provider(id、name、apiUrl、defaultModel、pipeline)
2. 如果协议和 OpenAI 兼容,直接复用 `openaiPipeline`,**不要**写新文件
3. 如果协议有差异,在 `input/normalizers/` 和 `output/parsers/` 加对应文件
4. 自测:用真实 API Key 跑通一次 chat + 一次 tool calling

PR 描述里附上:

- 测过的模型名
- 是否支持流式 / Tool Calling / Reasoning
- 限流或鉴权坑(如果有)

---

## 提 Issue

提 bug 之前请:

- 在已关 / 已开 Issue 里搜一遍关键词
- 给出复现步骤、操作系统、Node 版本、是否一键安装
- 贴关键日志(去掉 API Key)

提 feature 之前请:

- 描述场景,而不是只写"建议加 X 功能"
- 说明为什么现有方式不够用

---

## 提 PR

1. 从 `main` 拉新分支:`git checkout -b feat/your-thing`
2. **保持 PR 小** — 一个 PR 只做一件事,几十行比几千行更容易合
3. Commit message 用人话写清楚为什么改、改了什么、影响什么(不强制 Conventional Commits)
4. PR 描述里写:**做了什么** / **为什么** / **怎么自测的**
5. 如果改了用户能看到的部分,贴一张截图或 gif
6. 不要把 `database/`、`files/`、`node_modules/`、构建产物提交进来

---

## 代码风格

- 当前没有强制的 lint / formatter,跟随现有文件的风格写
- 缩进 2 空格,JS / Vue 单引号,字符串模板优先
- 文件命名:JS 用 `kebab-case.js`,Vue 单文件用 `PascalCase.vue` 或 app 内统一的 `index.vue`
- 中文注释 OK,但函数名、变量名用英文
- 不要为了"显得专业"加一层不必要的抽象 — 当前阶段直接、可读 > 可扩展

---

## 行为准则

保持基本的尊重和善意。技术讨论对事不对人,意见不同就摆事实、给方案。

---

## 联系

- 日常讨论:[Discord](https://discord.gg/YfCbV3m9Q)
- Bug / Feature:[GitHub Issues](https://github.com/realuckyang/AIOS/issues)

谢谢 — 期待在 PR 列表里看到你。
