# AIOS Framework UI Demos // 框架界面演示中心

> **[SYS_STATUS]** RUNNING // **[THEME]** SLATE WORKSTATION // **[ACCENT]** FLUORESCENT CYBER-BLUE (`#00e5ff`)

---

## 🧭 演示项目定位 (What the Demos Do)

本目录下的演示项目是为 **AIOS (AI Agent 的多应用操作系统框架)** 设计的高保真、交互式前端原型界面。

这些 Demo 不仅是静态的网页模板，而是通过 **原生 JavaScript** 注入了真实数据状态与控制逻辑 of **全功能单页控制台原型**。它们旨在体现一种纯粹的 **OS (操作系统) 心智**：
* **桌面端**：左侧为垂直分布的极窄 **应用切换器 (App Switcher)**，右侧为当前处于激活状态的 **完整应用工作区**。
* **移动端**：彻底移除了底部易产生手势冲突的 Dock 栏，升级为**“顶部系统条 (Status Bar) + 左侧滑出式应用抽屉 (Hamburger Drawer)”**的极简架构，完美释放手机纵向视口。
* **适应海量应用**：桌面端切换列表支持隐藏滚动条的自适应无限垂直滚动，移动端抽屉支持高密度列表滚动，从容应对未来数十个 Agent 协同应用的拓展需求。

### 📂 演示应用板块一览：
1. 💻 **会话控制 (Chat/Agent Console)**：双分栏设计，左侧为控制台活跃会话（Session）与 AI 执行参数，右侧为会话日志。原生实现了可折叠展开的 **推理思考链 (`[thought]`)** 与 **Shell 命令调用痕迹**，支持指令输入并模拟多步沙盒响应。
2. 🚦 **后台任务 (Tasks)**：展示当前正在运行、成功、或中断的 Agent 任务状态。包含详细的任务 PID/元数据网格，以及一个直连编译器的 **实时命令行终端 (Logs Console)**。支持一键强杀进程的 `SIGINT` 中断命令交互。
3. 🧠 **记忆中心 (Memory)**：对本地长对话备注（Remarks）进行高密度分类归档（Private / Workspace / Public），具备即时的多关键字模糊过滤检索。
4. ⚙️ **系统设置 (Settings)**：包括大模型 API Endpoint 修改、Tool Loop 迭代上限阈值设定、沙盒高危命令正则白名单过滤，以及系统 CPU/RAM 沙盒容器占用率的**实时动效监视仪表**。

---

## 🎨 视觉风格：荧光赛博控制台 (Fluorescent Cyber-Console)

在五套不同的演示风格中，我们首推并重点打磨了 **Slate 工业级暗色工作站风格 (Slate Industrial Workstation, `index.html`)**。

这一设计被描述为**“极度理智、冷峻的荧光赛博控制台美学”**，具备以下三大视觉支柱：

### 1. 荧光蓝对撞暗炭黑 (Luminous Cyber-Blue on Carbon Black)
* **设计表现**：在深暗、防眩光的炭黑背景（`#090a0f`）与深蓝灰面板（`#0e1017`）基调上，使用高饱和度、高亮度的**荧光青蓝（Cyber-Cyan, `#00e5ff`）**作为系统的能量流线（如激活状态、心跳灯、代码前缀）。
* **赛博质感**：亮色的荧光蓝在深色底的反衬下，会在视网膜上产生如同霓虹、全息投影或飞船 HUD（平视显示器）般的**“自发光错觉”**。这是一种典型的赛博朋克高科技信号，传递出系统正在通电、高速运转的心智。

### 2. 锋利的网格结构与物理边界 (Sharp Borders & Hard Grids)
* **设计表现**：完全摒弃了移动端应用中常见的大圆角、大投影和弥散渐变。圆角控制在极其微弱的 `4px - 6px` 内，各组件和应用区域边界均由 **1px 锋利的实线物理边界**（`#24293a`）锁死。
* **工具感受**：强烈的网格分栏（Hard Grid）带来如同物理仪器控制面板般的严密秩序感，所有模块划分有迹可循，突出界面的“生产力工具”本质。

### 3. 双字体排版与命令行质感 (Dual-Typography & Shell Aesthetic)
* **设计表现**：按钮和标签使用规整的无衬线英文字体（Inter / Outfit），数据、运行指标、日志输出及命令行前缀全部强制使用硬朗的等宽字体 **JetBrains Mono**。
* **诚实表达**：界面不过度包装，不隐藏 AI 的思考日志（Reasoning）和 `shell` 工具调用细节，将高密度的执行状态直观呈现，极具极客掌控感。

---

## 🗃️ 交付风格版本清单 (Style Variations)

我们在目录中提供了以下 **5 种不同审美方向** 的高保真实现，您可以根据需求直接双击打开进行效果对比：

| 风格版本 | 主色调方案 | 核心视觉特征 | 快速体验链接 |
| :--- | :--- | :--- | :--- |
| **01. Slate Workstation** | 暗炭黑 / 荧光青蓝 | 现代暗色 IDE 质感、冷光指示器、高能荧光自发光错觉 | [index.html](file:///Users/woodchange/Desktop/realuckyang/AIOS/dev/demos/framework-ui/index.html) |
| **02. Cyber Terminal** | 纯黑 / 矩阵荧光绿 | CRT 显像管扫描线纹理、GlitchBlit 呼吸阴影、极客黑客帝国风 | [cyberpunk.html](file:///Users/woodchange/Desktop/realuckyang/AIOS/dev/demos/framework-ui/cyberpunk.html) |
| **03. Swiss Monochrome**| 纯白 / 极简纯黑线 | 无圆角直角设计、包豪斯网格排版、电子仪器图纸/蓝图感 | [minimal.html](file:///Users/woodchange/Desktop/realuckyang/AIOS/dev/demos/framework-ui/minimal.html) |
| **04. Classic OS Bevel** | 经典灰 / 海军蓝标题 | Windows 95/Classic Mac 浮雕三维按压框、复古像素图标质感 | [classic_os.html](file:///Users/woodchange/Desktop/realuckyang/AIOS/dev/demos/framework-ui/classic_os.html) |
| **05. Nord Tactical** | 深灰蓝 / 极地冷色 | 低对比度防眩光设计、极光绿与冰蓝软调渐变、军工雷达台感 | [nordic.html](file:///Users/woodchange/Desktop/realuckyang/AIOS/dev/demos/framework-ui/nordic.html) |
| **06. Aurora Hologram**  | 电光荧光蓝 / 皇家霓虹蓝 | 毛玻璃玻璃拟态 (Glassmorphism)、动态弥散蓝光背景、极度深邃沉浸 | [glassmorphism.html](file:///Users/woodchange/Desktop/realuckyang/AIOS/dev/demos/framework-ui/glassmorphism.html) |
| **07. Solarized Scholar**| 暖米黄 / 泥砖褐 / 靛蓝 | 仿 E-Ink 电子纸质感、印刷体衬线排版、高对比度阅读防眩光 | [solarized.html](file:///Users/woodchange/Desktop/realuckyang/AIOS/dev/demos/framework-ui/solarized.html) |

---

> **“未来不会流于无形，依然会留于物形。”** 🌱  
> **未来不仅是对话，更是由 AI 原生构建、深度沟通的操作系统级全栈控制中心。**
