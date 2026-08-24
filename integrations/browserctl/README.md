# AIOS Browser Control

让 AIOS agent 控制你浏览器的**执行桥**。agent 理解意图后，把操作指令经由本机通信服务下发给浏览器扩展，扩展在你正在浏览的页面执行并回报结果。

## 组成

```
integrations/browserctl/
├── extension/     ← 你要安装的 Chrome 扩展（加载此目录）
│   ├── manifest.json
│   └── background.js
├── server.js      ← agent 侧本地通信服务（agent 运行）
└── README.md
```

## 安装（你只需做一次）

1. 在 Chrome 地址栏打开 `chrome://extensions`
2. 右上角打开「开发者模式」
3. 点「加载已解压的扩展程序」，选择 `integrations/browserctl/extension/` 目录
4. 确认扩展「AIOS Browser Control」出现，并授予权限（初次会提示 `<all_urls>` 站点权限）

> ⚠️ 当前 host_permissions 是 `<all_urls>`（便于任何站点都能被控）。正式使用时建议收窄成你实际要操作的站点，例如 `["https://example.com/*"]`。

## 运行通信服务（agent 侧）

```bash
node integrations/browserctl/server.js
# 监听 http://127.0.0.1:9524
```

## 控制链路

```
你(说"帮我……") → AIOS agent(拆成指令) → POST /command → server 排队
   → 扩展 poll 领取 → 在页面执行(读DOM/填表/点击/导航) → POST /report 回报
   → agent 读 /results 判断下一步 → 循环
```

## 支持指令

| type | payload | 说明 |
|---|---|---|
| `getTabInfo` | – | 返回当前活动标签的 title/url |
| `listTabs` | – | 列出所有标签页 |
| `navigate` | `{url}` | 跳转当前标签到 url |
| `run` | `{code}` | 在当前页面执行一段 JS，返回结果 |

## 安全与边界

- 本桥让 agent 能读取你浏览器中的登录态/页面数据，属**敏感通路**。建议仅在你信任的 AIOS 会话中使用。
- 破坏性操作（提交、下单、支付、发帖、删除）请先确认。
- `run` 使用页面内 `eval`，在部分站点的 CSP 下会被禁用并返回 `__evalError`。
