# 前端结构

前端使用 React，采用经典的 `pages / components / api` 结构。左侧显示用户对话，右侧显示当前对话创建的其他对话。

应用由对话页和设置页两个视图组成，不引入路由库或全局状态库。

## 目录

```text
ui/
├── index.html
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── api.js
    ├── events.js
    ├── format.js
    ├── app.css
    │
    ├── pages/
    │   ├── ChatPage.jsx
    │   └── SettingsPage.jsx
    │
    ├── components/
    │   ├── Icon.jsx
    │   ├── layout/
    │   │   ├── Sidebar.jsx
    │   │   └── Header.jsx
    │   │
    │   ├── chat/
    │   │   ├── Thread.jsx
    │   │   ├── Composer.jsx
    │   │   ├── Stream.jsx
    │   │   ├── Markdown.jsx
    │   │   ├── ToolCall.jsx
    │   │   ├── Compaction.jsx
    │   │   └── Usage.jsx
    │   │
    │   └── call/
    │       ├── ChatPanel.jsx
    │       ├── ChatList.jsx
    │       └── ChatDetail.jsx
    │
    └── hooks/
        ├── useChats.js
        ├── useChat.js
        └── useCalls.js
```

## App

`App.jsx` 只挂载页面：

```jsx
export default function App() {
  return <ChatPage />;
}
```

页面切换由 `ChatPage` 内部状态完成，目前不需要 URL 路由。

## Pages

### `ChatPage.jsx`

主页面负责组合布局和保存当前选择：

```js
{
  chatId,
  drafting,
  panelOpen,
  sidebarOpen,
  page,
}
```

页面结构：

```text
ChatPage
├── Sidebar
├── workspace
│   ├── Header
│   ├── Thread
│   └── Composer
├── ChatPanel
└── SettingsPage
```

`ChatPage` 可以调用 hooks，但不解析 Responses item，也不直接拼 HTTP 请求。

## Components

组件按界面区域分为三组：

- `layout/`：页面骨架和导航
- `chat/`：当前对话及内容流
- `call/`：异步调用面板

每组只增加一层目录，不在内部继续按按钮、列表或 hooks 细分。

### `layout/Sidebar.jsx`

显示：

- 单行对话标题、更新时间和必要的运行状态
- 新建、删除和设置入口

左侧只加载 `origin = user` 的对话。`origin = call` 的对话不进入左侧列表。

点击“新对话”只进入前端草稿态，不立即调用 API。用户发送第一条消息时才通过 `POST /api/chats` 创建真实对话。

### `layout/Header.jsx`

显示当前对话标题。右侧使用与左侧栏相同样式的侧栏切换按钮控制执行对话面板，不显示文字入口。

### `chat/Thread.jsx`

负责对话滚动区域：

- 渲染历史 items
- 渲染流式 reasoning 和 message
- 显示错误和运行状态
- 在新内容到达时滚动到底部

### `chat/Composer.jsx`

负责：

- 输入消息
- Enter 发送
- Shift+Enter 换行
- 乐观显示用户输入
- 对话运行时显示停止按钮

发送成功后，以服务端 `input` 事件中的 item ID 确认为准并去重。

### `chat/Stream.jsx`

先根据行信封中的 `source` 决定来源布局，再根据 Responses item 类型渲染内容：

```text
source=user     右侧用户气泡
source=model    左侧模型消息、推理或工具调用
source=tool     左侧工具结果（与对应 function_call 合并）
source=runtime  左侧、默认折叠的执行对话回传
compaction      左侧、默认折叠的压缩通知
```

`source` 位于 item 外层；`item` 本身始终保持标准 Responses API 结构。

主消息容器与底部输入框使用相同内容宽度。用户及执行任务消息右对齐，模型、思考和工具内容左对齐，单条最大约占内容列 70%。普通模型消息不显示额外的“Agent”发送者标签。思考、压缩和执行对话回传使用完整的折叠气泡：收起时标题也在气泡内，点击后在同一气泡中展开正文。错误使用独立的居中 banner，不属于消息流 item。

### `chat/ToolCall.jsx`

按照 `call_id` 将 bash 的 `function_call` 和 `function_call_output` 组合显示。

### `chat/Compaction.jsx`

靠左显示压缩通知，默认折叠，点击后展开摘要。压缩记录来自 `compactions`，不是 item。

### `chat/Usage.jsx`

显示历史 items 上累计的 token 用量；上游提供 `cost` 时同时显示累计成本。进度条使用默认上下文窗口估算比例，不读取设置页修改后的窗口值。

### `call/ChatPanel.jsx`

右侧只读执行对话面板，在当前对话创建的对话列表和目标对话详情之间切换。

### `call/ChatList.jsx`

显示当前对话通过异步调用创建的所有对话：

- 目标对话标题
- pending、running、completed、cancelled 或 failed
- 更新时间

### `call/ChatDetail.jsx`

显示：

- 目标对话基础信息
- 目标对话完整 items
- 相关调用状态

详情仅用于查看，不提供输入框或继续发送入口。

## Hooks

Hooks 只封装页面需要的状态和操作，不再继续拆 reducer 或 provider。

### `useChats.js`

负责：

- 加载对话列表
- 创建和删除对话
- 根据 `status` 事件更新运行状态
- 内容事件到达后更新时间并重新排序

### `useChat.js`

负责当前对话：

- 加载对话信息、items 和 compactions
- 发送消息
- 停止运行
- 保存流式 delta
- 处理当前对话的 SSE 事件

### `useCalls.js`

负责：

- 加载当前对话的 Calls
- 加载当前对话创建的目标对话
- 根据 `call` 事件更新状态

执行对话详情的选择和内容加载由 `ChatPanel` 管理。

## API

所有 HTTP 方法继续集中在 `api.js`：

```js
listChats();
createChat(data);
getChat(id);
updateChat(id, changes);
removeChat(id);

listItems(chatId);
sendMessage(chatId, content);
stopChat(chatId);

createCall(chatId, data);
listCalls(chatId);
getCall(id);
listCreatedChats(chatId);
```

文件变得明显过长后，才考虑拆成 `api/chats.js`、`api/items.js` 和 `api/calls.js`。

## Events

`events.js` 只建立一条 SSE 连接：

```js
subscribe(onEvent);
```

`ChatPage` 建立订阅，再将事件交给三个 hooks：

```text
status
  → useChats
  → useChat

input / reasoning / message
tool_calls / tool_results
compaction / done / error
  → useChat

call
  → useCalls

gap
  → 三个 hooks 全部重新加载
```

SSE 断开不会停止对话。

## CSS

目前继续使用一个 `app.css`。

按区域排列：

```text
变量和基础样式
页面布局
Sidebar
Header
Thread 和 Stream
Composer
ChatPanel
响应式布局
```

只有当文件确实难以维护时，再拆分 CSS。

## 原则

- 页面负责组合，组件负责展示和局部交互。
- hooks 负责数据和状态。
- `api.js` 不依赖 React。
- 展示组件不直接发 HTTP 请求。
- 整个应用只建立一条 SSE 连接。
- Calls 作为右侧目标对话背后的调用记录。
- 执行对话面板只读；新的执行对话由 Agent 通过当前对话的 `/calls` 接口创建。
- 当前规模不引入路由库、全局状态库或更细的目录分层。
