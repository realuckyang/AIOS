# 2026-08-18 · AIOS v4:从「加应用」到「自进化」

> AGENT 实验(仓库 `yanglongyun/AGENT`,package 名 `aios-v4`)的成果并回 AIOS 主线。
> 代码整树覆盖,`dev/` 史料与根 README(理念宣言)保留不动。
> 本文解释这一版的思想变化、架构落点与本次操作。

## 一句话

上一代的答案是**在不可变的系统壳里加应用**;这一代的答案是**壳与应用都可塑,
只留一根不可变的脊柱** —— 系统的其余部分,交给 agent 与用户共同进化。

---

## 思想:推进了哪一步

上一代 AIOS 的公理是「把冻结的部分缩到最小,把可塑的部分让给使用者」。
当时冻结的是系统壳(对话、外壳、内核),可塑的是应用层:用户说话,AI 造应用。

这一版把同一条公理往下推了一层:

- **壳也是 userland。** App 层(对话管理、持久化、上下文策略、UI)不再是系统的
  一部分,而是运行在内核之上的、可以被改写的东西。要不要应用、应用长什么样、
  甚至要不要这套对话界面,都是可变项。
- **工具自扩展。** agent 的工具不是出厂写死的清单:`etc/tools.json` 是注册表,
  `bin/` 下是可执行程序 —— agent 可以为自己编写新工具并注册进来。
- **调用方式全面开放。** agent 可以递归调用自己(Kernel 的 run API);外部程序
  可以直接走 API 调用;也可以写脚本把多次调用编排成程序化流程。上一代
  「应用反向给 AI 下发 Activity」是单向特例,这里推广成了「任何东西调用任何东西」。

自进化真正的难题不是「什么都能改」,而是「**为了改得安全,什么绝对不能改**」——
修复者坏了,谁来修复它。这一版的回答就是三进程架构里那根脊柱:

- **Boot 在系统之外**:只管拉起和看护进程,任何自我改写都碰不到它;
- **Kernel 无持久状态**:只执行一次 run,崩了重启即回到干净态,不需要恢复;
- **guard 与出厂 `bin/` 工具**:独立于被进化的部分,是逃生通道的地板;
- **Console 直连 Kernel**:App 被改坏时,仍有一条不依赖 App 的路可以进去修。

旧命题(「聊天替代不了界面,形态即价值」)没有被放弃,它换了位置:
从系统的前提变成进化的**目标态**。自进化的产出应当凝固成稳定的形态 ——
应用、界面、可复用的工具 —— 而不是永远保持液态。旧命题定义往哪里去,
新命题定义怎么去。检验这一版的标准只有一条:**是否更快地长出更好的形态。**

---

## 架构落点

```text
npm start
   └── boot.js                 外部启动器,看护与重启
       ├── kernel/index.js     :9522  无持久状态,单次 run 的模型工具循环
       └── app/server/index.js :9523  有状态,对话/SQLite/上下文策略/UI
```

边界判断:宿主进程编排进 Boot;一次模型执行无法外包的机制进 Kernel;
持久状态和产品策略进 App/userland。

- Kernel:Responses API、内存工具循环、bash、扩展工具执行、run/stop HTTP API。
  不拥有 chat,不启动 App,不读写对话历史。
- App:拥有对话与持久事实(`var/aios.db`),选择跨轮上下文,把完整 input 交给
  Kernel;App 崩溃不损坏磁盘事实,Kernel 崩溃不需要恢复聊天状态。
- 详细设计见 [`dev/design/`](../design/README.md);v1–v3 历史版本在 `dev/lib/`。

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

安全:这个 agent 能执行命令并修改文件,只在信任的机器上运行,不要暴露到公网。
`var/`、`run/`、`etc/config.json` 已被 Git 忽略。

---

## 本次操作

沿用 2026-06-17 那次的原则:整树覆盖、不带 `.git/`、不带依赖与运行产物、
不改写历史,形成一组正常提交。

**拿过来的**(以 AGENT 仓库的 git 跟踪清单为准):`boot.js`、`stop.js`、
`kernel/`、`app/`、`bin/`、`etc/`(仅 example 配置、instructions、tools 注册表)、
`skills/`、`package.json`、`LICENSE`、`.gitignore`、`dev/design` 与 `dev/lib`(v4 设计文档与 v1–v3 历史)。

**删掉的旧代码**:`server/`、`ui/`、`language/`、`scripts/`、`skills/`(旧版)、
三个 install 脚本、旧 `package.json` / `package-lock.json`。

**保留不动的**:根 `README.md`(理念宣言,依然成立)与 `dev/` 全部史料。
两代资料合并进同一个 `dev/`:原有的 `doc`(文章)、`timeline`、`contributions`、
`demos`、`industry-news` 不动,AGENT 带来的设计文档进 `dev/design`,v1–v3 历史版本
进 `dev/lib`;`dev/test` 指向已删除的旧 server,一并移除。

**没带的**:`etc/config.json`(含密钥,gitignore)、`var/`、`run/`、构建产物。

**仓库快照**:AGENT 仓库连同完整 git 历史存档为本目录的 `AGENT-2026-08-18.zip`
(git clone 出的干净副本,只含已提交内容;入档前全历史扫描过密钥形状与真实网关
地址,零命中)。解压即得可用仓库,与最古老的 `meeem.zip` 同列。

---

> 追记(2026-08-19):文中的 `dev/` 目录已整体更名为 `archive/`,内部结构不变。
