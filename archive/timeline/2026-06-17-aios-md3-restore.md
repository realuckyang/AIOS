# 2026-06-17 · AIOS 回到 MD3/Google 风格基线

> 本轮目标不是继续沿着 06-12 的框架化版本往前做,而是把 AIOS 拉回更早的
> MD3 / Google 风格阶段:应用更多、界面更轻、更像一个热闹的个人 AI 工作台。
> 操作方式明确为「拿历史版本出来覆盖,形成新的提交」,不是 reset,也不是切分支。

## 最终状态

当前主线被恢复到 **a6d1953 的 24 应用基线**,但欢迎页使用
**3cd8f3a 的欢迎页与文案**。

同时完成了这些整理:

- 前端源码目录统一命名为 `ui/`;
- 恢复此前指定的中英文 README;
- 恢复丰富的 `dev/` 资料目录;
- 删除重复的顶层 `doc/`,保留 `dev/doc`;
- 保留为一组新的正常提交,而不是改写历史。

## 前史:先用 AGENT 覆盖过 AIOS

在回到 MD3 / Google 风格之前,曾经先把桌面的 AGENT 项目拿来覆盖 AIOS,
目标是把当前 AGENT 作为 AIOS 的新版本提交进去。

当时操作原则是:

- 从 `/Users/woodchange/Desktop/AGENT/` 同步到
  `/Users/woodchange/Desktop/AIOS/AIOS/`;
- 不带 `.git/`;
- 不带依赖与运行产物,例如 `node_modules/`, `dist/`, `ui/dist/`,
  `data/`, `.env`;
- 覆盖后在 AIOS 里安装依赖、构建、检查;
- 构建验证完成后再删除依赖和产物,保持仓库干净。

形成提交:

```
b57990c Replace AIOS with refreshed agent workspace
```

随后发现原来的 `dev` 目录和 README 资料不应该被覆盖删除,于是又从旧历史里
恢复了这些材料:

- `dev/`
- `AGENTS.md`
- `LICENSE`
- `README.md`
- `README_en.md`

形成提交:

```
ff8dcad Restore AIOS dev and readme materials
```

这两步是后来继续追溯 README、MD3/Google 风格、`a6d1953` 和 `3cd8f3a`
的背景。也就是说,本轮不是单纯从最新代码小修,而是经历了:

```
当前 AGENT 覆盖 AIOS
→ 恢复旧 dev/readme 材料
→ 发现当前方向不对
→ 回到 MD3/Google 风格历史基线
```

## 为什么选 a6d1953

查历史后确认,MD3 / Google 风格里内置应用最多的时候是 `a6d1953`
附近。它注册了 24 个应用:

```
chat, tasks, notebook, finance, terminal, files, claude-code, sysinfo,
subbox, banana, fortune, ghtrending, rssreader, memory, lovehouse,
hackernews, poker, treasure, debate, earth, civ, cryptobot, workshop,
settings
```

这版的价值是「热闹」:应用中心有密度,产品感更像一个 AI 工作台,
不是只剩内核演示。

## 为什么补 3cd8f3a 欢迎页

`a6d1953` 还没有独立的 `WelcomeView.vue`,首次使用主要走
`LoginView.vue` 的 setup 模式。`3cd8f3a` 的欢迎页更完整:

- 左右分栏;
- 文案有明确的 AIOS 叙事;
- 标题为「AI 时代的操作系统」;
- 包含「未来留于物形」「让软件真正走向每一个人」「应用也可以和 AI 对话」。

所以最终采用:

- 代码主体: `a6d1953`
- 欢迎页与路由接线来自 `3cd8f3a` 当时的前端视图与路由文件,
  落到当前 `ui/src/views/WelcomeView.vue` 和 `ui/src/system/router.js`

## 实施记录

### 1. 临时启动历史版本

先分别用 worktree 临时启动了两个候选版本:

- `3cd8f3a` -> `/Users/woodchange/Desktop/AIOS-md3-3cd8f3a`
- `a6d1953` -> `/Users/woodchange/Desktop/AIOS-md3-a6d1953`

为了避免和当前服务冲突,临时端口使用:

- `3cd8f3a`: `9602 / 9603 / 9604`
- `a6d1953`: `9702 / 9703 / 9704`

发现 `a6d1953` 的语言烘焙如果绕过 `npm run dev` 会显示未替换的文案
token,因此确认了当时的语言方案:

```
language/<locale>/**/*.json 作为文案源
源码里写 __T_XXX__ token
scripts/start.mjs 在启动前把 token 直接替换进源码
```

临时查看时用:

```bash
AIOS_ALLOW_SOURCE_BAKE=1 node scripts/start.mjs zh --force
```

完成中文烘焙。

### 2. 覆盖当前 main

按要求没有 reset,而是在当前 `main` 上把历史版本取出来覆盖:

- 用 `a6d1953` 覆盖当前工作树;
- 再从 `3cd8f3a` 恢复欢迎页和 router;
- 运行语言烘焙和构建确认。

形成提交:

```
d52c800 Restore a6d1953 app set with 3cd8f3a welcome
```

验证点:

- `ui/src/apps.js` 中应用数量为 24;
- `/welcome` 指向 `WelcomeView.vue`;
- 欢迎页文案包含「AI 时代的操作系统」「未来留于物形」;
- `AIOS_ALLOW_SOURCE_BAKE=1 npm run build` 通过。

### 3. 前端目录统一为 ui

历史版本里的前端目录名与当前约定不一致。随后整体统一为 `ui/`:

- 前端源码目录统一为 `ui/`;
- `package.json` 中 Vite 命令改为 `ui/vite.config.js ui`;
- `server/main/service/runtime/http.js` 静态目录改为 `ui/dist`;
- language APP.md / contexts 中的前端路径统一改为 `ui/src/...`;
- reload 弹窗文案改为 `ui/`。

形成提交:

```
708e634 Rename frontend directory to ui
```

构建验证:

```bash
AIOS_ALLOW_SOURCE_BAKE=1 npm run build
```

通过。

### 4. 恢复 dev 资料目录

用户删除了 `dev` 和 `doc` 后,要求恢复以前丰富的 `dev/`。对比历史发现:

- `e0d43fe` / `ff8dcad` 的 `dev/` 最丰富,约 89 个文件;
- `3cd8f3a` 的 `dev/` 约 79 个文件;
- 当前恢复基线里只剩 1 个 `dev` 文件。

最终从 `e0d43fe` 恢复 `dev/`,包含:

- `dev/demos`
- `dev/contributions`
- `dev/doc`
- `dev/industry-news`
- `dev/timeline`
- `dev/test`

形成提交:

```
18740e7 Restore rich dev directory
```

### 5. 恢复 README

恢复此前指定过的中英文 README:

- `README.md` 来自 `5182adc`,包含:

```text
完成你的日常任务,构建紧贴你需求、习惯、爱好的原生应用。
通过 AI 任务系统,让你的应用也可以和 AI 对话。
```

- `README_en.md` 来自 `0a4e39b`,包含:

```text
Build native apps tailored to your needs through dialogue.
A unified AI kernel that lets your apps talk to AI, too.
```

形成提交:

```
bd91d5f Restore earlier README files
```

### 6. 删除重复顶层 doc

恢复 `dev/` 后,资料已经集中在 `dev/doc`。顶层 `doc/` 属于重复目录,
被删除并形成提交:

```
cc4ceb1 移除重复文档
```

### 7. 推送问题

推送时遇到:

```text
RPC failed; curl 55 Recv failure: Connection reset by peer
send-pack: unexpected disconnect while reading sideband packet
fatal: the remote end hung up unexpectedly
```

排查后确认不是仓库过大:

- `dev/` 总大小约 15M;
- 最大文件是 `dev/contributions/.../hero.mp4`,约 13M;
- `dev/timeline/meeem.zip` 约 364K;
- `.git/objects` 约 30M。

判断更像 HTTPS 推送连接被重置,不是内容体积超限。

## 当前提交序列

本轮关键提交:

```
ff8dcad Restore AIOS dev and readme materials
b57990c Replace AIOS with refreshed agent workspace
cc4ceb1 移除重复文档
bd91d5f Restore earlier README files
18740e7 Restore rich dev directory
708e634 Rename frontend directory to ui
d52c800 Restore a6d1953 app set with 3cd8f3a welcome
```

远端当时停在:

```
708e634 Rename frontend directory to ui
```

本地还有 3 个提交待推:

```
cc4ceb1
bd91d5f
18740e7
```

## 结论

AIOS 当前方向从「06-12 框架化最小样板」回到了「MD3/Google 风、应用丰富」
的历史状态。这个状态更适合展示 AIOS 作为个人 AI 工作台的早期想象:
应用多、入口热闹、文案更接近产品叙事。

后续如果继续推进,应优先处理两件事:

1. 重新推送远端,必要时改用 SSH 或分批推送;
2. 在这套 24 应用基线里逐步修整稳定性,而不是再次大幅切换方向。
