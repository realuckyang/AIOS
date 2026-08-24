# 2026-06-12 · AIOS 收敛:框架化 + 开源化总设计

> 战略定调:AIOS 不再产品化,转为**框架化 + 开源化**,然后告一段落。
> 涉及三个交付物:AIOS 主项目、AIOS-android、chatnext 版本(CF 生态)。
> wandesk(桌面语义版)已就绪开源,本轮不动,仅作开源形态标杆。
>
> 工作重心:**理念与方法层面的东西**。用户体验细节、UI 样式都不是重点 ——
> UI 只要「大致的模样、基本的样式」,能把框架理念演示清楚即可。

## 一句话

一切皆应用 + 应用面板作为唯一系统约定 = 把「系统」缩到最小,把自由最大化地让给应用。

---

## 总纲:什么是「框架化」

产品化追求的是终端体验闭环;框架化追求的是**最小约定 + 最大自由**:

1. **公布的是理念与契约**,不是像素。开源仓库的核心资产是:架构分层、应用契约
   (APP.md / registry / 五件套)、Agent 循环、应用面板协议。
2. **UI 降级为参考实现**。样板应用的界面做到「干净、能看、能跑」即止,
   不再打磨氛围感细节;设计语言只约束到「浅色、简约」这一层。
3. **每个项目独立完成开源**,各自一个仓、各自一份中英 README、统一 License,
   最后在主仓 README 画一张生态图收口。

---

## 第一部分 · AIOS 主项目:一切皆应用

### 核心理念

**所有的都是应用。对话是应用,设置也是应用。**

系统层面**不提供统一的框架壳**(没有全局 Topbar、没有全局 Sidebar、没有系统级
导航容器)。系统对应用的全部 UI 约定只有一条:

> **每个应用必须在自己界面的右上角导入「应用面板」组件。**

用户点击任何应用右上角的面板按钮,即可切换到其他应用。除此之外,
应用的顶部、布局、风格、交互**完全自定义**——这给予应用最大的自由空间。

### 为什么这样设计

- **倒置了系统与应用的关系**:传统 OS 式框架是「壳包应用」,应用活在系统的
  窗口/路由容器里;AIOS 改为「应用即全屏世界,系统只是一个右上角的传送门」。
- **对话不再特殊**。chat 从「系统主界面」降格为一个普通应用后,内核
  (agent 循环、任务、记忆)与界面彻底解耦——这正是框架化要的切面:
  别人可以不用我们的 chat 界面,只用内核。
- **设置同理**。settings 作为应用存在,意味着「系统配置」也只是走标准
  应用契约(自己的后端 + 自己的库 + APP.md),内核不为它开后门。
- **开源叙事干净**:框架 = 内核服务 + 应用契约 + 一个面板组件,三句话讲完。

### 架构落点(基于 06-04 的 agent-aios 干净内核)

延续 [2026-06-04 内核重写](2026-06-04-aios-kernel-rewrite.md) 的
system | apps 双轴与双服务(:9502 / :9503),在其上做两个调整:

```
ui/src/
  system/
    panel/        ★ 应用面板组件(唯一的系统级 UI 资产)
      AppPanel.tsx     右上角按钮 + 弹出网格(应用列表,数据来自 registry)
    state/ lib/ api.ts  系统侧状态与 API(无界面)
  apps/
    chat/         对话 —— 就是一个应用
    settings/     设置 —— 就是一个应用
    notepad/ todo/ ledger/   样板应用
    index.ts      registry(含默认启动应用 = chat)
```

1. **拆壳**:删掉系统级外壳/工作区导航(views 里的 5 工作区结构),
   路由退化为 `#/app/:id`,默认进入 chat 应用。
2. **chat、settings 应用化**:把现在系统侧的对话界面、设置界面迁入
   `ui/src/apps/chat`、`ui/src/apps/settings`,走与 notepad 相同的注册方式。
   它们的后端可以例外地直连系统 API(:9502 的 chat/settings 服务)而不必
   自带 :9503 后端——契约上注明这是「系统应用」的特权,普通应用不可用。

### 应用面板契约(框架的唯一 UI 约定)

```tsx
import { AppPanel } from '@/system/panel'
// 应用根组件内,自行决定放在自己顶部结构的右上角
<AppPanel />
```

- 面板组件自身样式自包含(固定尺寸按钮 + Popover),不依赖宿主应用的 CSS;
- 数据来自前端 registry(应用 id / 名称 / 图标),点击项即路由切换;
- 约定写入 APP.md 规范与 create-app 技能指南:**AI 生成新应用时必须包含
  AppPanel 导入**——这是应用审查的第一条检查项。

### 开源收尾清单

- [ ] License 统一(README badge 与 LICENSE 文件现不一致,ISC/MIT 二选一)
- [ ] 写 AGENTS.md(仿 wandesk):分层规则、应用五件套契约、AppPanel 约定
- [ ] README 从产品介绍改写为框架介绍(理念 → 契约 → 快速开始 → 写一个应用)
- [ ] 砍产品化残留:dev/industry-news、演示性应用(fortune/goal)去留裁决
- [ ] 样板应用 UI 降到「基本样式」基线,不再投入细节打磨

---

## 第二部分 · AIOS-android:壳不动,内核对齐

### 方针

**沿用现在的壳**(Kotlin 宿主 + PRoot rootfs + 内嵌 Node 运行时 + WebView
指向本机服务),这套「真本地运行时、非 WebView 皮套」的架构本身就是它的
框架价值,不重做。要做的是**内嵌的 AIOS 与主项目对齐**。

### 差异评估(现状 → 目标)

| 维度 | Android 现状 | 主项目目标态 | 对齐动作 |
|---|---|---|---|
| 内嵌源码 | assets/aios 是旧 AIOS(Vue)源码副本,手工同步 | agent-aios 新内核(React) | 改为构建时从主仓同步(仿 wandesk 的 upstream/ 跨仓模式),不再手存副本 |
| 端口 | 主 9500 / 应用 9501 / Bridge 9502 | 主 9502 / 应用 9503 | 两个方案:① 内嵌侧改回主仓端口,Bridge 挪走(避开 9502 冲突);② 启动注入环境变量改端口。倾向 ①,保持「内嵌的就是主仓原样」 |
| UI 形态 | WebView 加载移动端入口(/aios/mobile) | 一切皆应用 + AppPanel | 主仓拆壳后移动端自然继承;AppPanel 在小屏上的弹出形态由组件自己响应式处理,Android 侧零改动 |
| Bridge | BridgeServer 提供原生能力 | — | 保留;framing 上定位为「平台能力以普通 HTTP API 暴露给应用」,可写进 APP.md 体系(如 platform/android.md) |
| 鉴权 | 无(设备本地) | 主仓也不要鉴权层(06-04 已砍) | 一致,无动作 |

### 开源收尾清单

- [ ] **keystore/ 移出仓库**并查 git 历史;若密钥曾入库 → 换新密钥 + squash 开新仓
- [ ] 瘦身:rootfs / Node 二进制改构建时下载,源码副本改构建时同步,仓库只留 Kotlin 宿主 + 脚本(目标 < 50MB)
- [ ] LICENSE 与主项目一致;中英 README,定位一句话:「把 AIOS 装进手机的本地运行时」
- [ ] 自签名打包文档(开源用户须能自己出 APK)

---

## 第三部分 · chatnext 版本:CF 原生框架

### 定位

chatnext/aios 实质上**依赖于 Cloudflare 生态**——这不是缺点,而是它区别于
主项目(本地 Node)和 wandesk(桌面)的存在理由。开源时定位为:
**AIOS 的 Cloudflare 原生版本**(建议改名 `aios-cloud` 与主项目区分),
我们公布的是框架:多租户 AI 应用运行时怎么在 CF 上搭。

### 交互骨架:对齐 mindbase

参照 projects/mindbase 的简约骨架,替换现有 UI(同样只做基本样式):

- **一个顶部条**(44px,白色毛玻璃 `bg-white/95 backdrop-blur`):
  左侧当前应用图标 + 名称,**右上角 9 宫格应用面板按钮**;
- **面板弹窗**(Popover,320px,圆角细边):上区应用网格,下区 Dock
  固定项(chat / settings);
- 配色走 mindbase 的 Notion 系:深灰棕主文本 `#373530`、
  强调青蓝 `#2383e2`、极淡悬停 `rgba(55,53,47,.06)`,系统字体栈,小字号高留白;
- 参考实现:`projects/mindbase/ui/system/components/AppShell.vue` + `Popover.vue`。

注意与主项目的理念差异并存:云端版用户应用是 iframe/沙箱页面,系统顶部条
由平台持有(多租户安全边界需要);主项目本地版才是「应用自管顶部」。
两者共享的是**应用面板**这个心智,README 里写明这一层差异即可。

### CF 新特性驱动的架构优化(2026-06 核实)

现状的执行模型是「应用 = D1 里存 HTML/JS 文件 + AppDO 私有 SQLite +
注入 app-sdk」,纯前端沙箱。结合平台新能力,框架可以升级为三层执行模型:

#### 1. Dynamic Workers(open beta,2026-03):应用获得真后端

- Worker Loader binding 允许用代码字符串**毫秒级实例化隔离 isolate**
  (<5ms,beta 期免费,GA 后 $0.002/天/唯一 Worker);
- **框架升级点**:应用从「纯前端 + SDK 代调」升级为可选自带 `server.js` ——
  AI 生成应用时同时生成前端文件与后端模块,后端经
  `env.LOADER.get(appId, …)` 动态加载,路由 `/apps/:id/api/*` 直达;
- 安全:`globalOutbound: null` 默认禁网(或仅放行平台代理),绑定按应用注入
  其专属 AppDO——**不可信用户代码也能安全跑后端**,这是云端版相对主项目
  最独特的框架卖点;
- 配合 **DO Facets**(Agents Week 2026):一个用户 DO 下挂多个独立 SQLite
  子对象,刚好映射「一用户多应用、每应用独立库」,替代现在每应用一个
  AppDO 实例的开销。

#### 2. @cloudflare/shell(Agents SDK 生态,早期):AI 的工作台

- 注意:用户提到的 cloudflare/shell **不是** Sandbox SDK——它是
  `cloudflare/agents` 仓库里的轻量包,在隔离 Worker 里跑 JS,
  提供 FileSystem 抽象(含 SQLite 持久化的 WorkspaceFileSystem);
- **框架升级点**:AI 改应用代码的工具链(read/write/edit_app_file)可以
  迁到这套原语上——AI 在虚拟文件系统里改完、跑一遍验证、再落库;
  替代现在「直接写 D1 文件表、写完无验证」的裸流程;
- 更重型的场景(npm install、真 shell)才用 **Sandbox SDK**(GA,2026-04,
  容器级),框架默认不依赖它,作为可选扩展写进文档即可——开源用户
  免费/低成本就能跑起来是优先级更高的目标。

#### 3. 打包与部署链路

- 平台侧**没有托管 bundler**:Script Upload API 接收的就是模块文件。
  框架取舍:**应用代码保持免打包**——前端 ESM + import maps,后端单模块
  交给 Dynamic Workers,从根上绕开 bundler 需求,这也最符合
  「AI 写完即生效」的体验;
- 若未来要长期托管「发布版」应用(商店安装量大的),再用
  **Workers for Platforms** dispatch namespace 落为持久 user Worker
  (GA,同步部署、可挂静态资源)——与 Dynamic Workers 的「即抛即用」互补,
  写进 roadmap,不进首版。

#### 执行模型三层总结

| 层 | 技术 | 用途 | 首版? |
|---|---|---|---|
| isolate 即时层 | Dynamic Workers + DO Facets | 用户应用后端、AI Code Mode | ✅ 核心 |
| 文件/验证层 | @cloudflare/shell | AI 改码 → 验证 → 落库 | ✅ 工具链 |
| 容器/托管层 | Sandbox SDK / Workers for Platforms | 重任务、发布版应用 | roadmap |

### 开源收尾清单

- [ ] 脱敏:wrangler.jsonc 账号/域名/LLM 端点抽成 example + secrets;
      **squash 历史开新仓**(最干净,规避历史泄密)
- [ ] 改名裁决(倾向 `aios-cloud`),去掉 `private: true`
- [ ] 预装应用 12 → 2~3 个样板(notes/todo),220KB store-seed 同步精简;
      love/reply/nextstep 等强产品语义应用删除
- [ ] UI 重置为 mindbase 骨架(基本样式)
- [ ] 零配置启动路径:`wrangler dev` + 任意 OpenAI 兼容 key 即可跑
- [ ] README 写清三层执行模型与三兄弟(本地/移动/云端)关系

---

## 收口

三仓开源就位后,在主仓 README + iimos 官网放生态图:

```
AIOS        本地 Node 版 —— 框架本体(一切皆应用 + AppPanel 契约)
AIOS-android 移动运行时 —— 同一内核装进手机
aios-cloud   Cloudflare 原生版 —— 多租户沙箱执行模型
wandesk      桌面语义版 —— 已开源(Sider-ai)
```

到此告一段落。

## 待裁决

1. License 统一用 ISC 还是 MIT(主项目两处现不一致)
2. chatnext 版本最终名称(建议 aios-cloud)
3. Android 端口对齐方案(① 内嵌原样 + Bridge 挪端口 / ② 注入环境变量改端口)
4. 主项目 chat/settings 的「系统应用特权」边界写多严(直连 :9502 是否仅限这两个)
