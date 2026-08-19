# OpenAI Codex OAuth 登录实现文档

## 概述

AIOS 支持通过 OpenAI Codex OAuth 登录，让用户无需手动填写 API Key，直接使用 ChatGPT/Codex 订阅账号调用 OpenAI 模型。

**核心原理**：复用 Codex CLI 的公开 OAuth 客户端凭据，通过 OAuth 2.0 Authorization Code + PKCE 流程获取 access_token，然后使用该 token 调用 Codex Responses API（而非标准的 `api.openai.com/v1/chat/completions`）。

## 关键发现

| 项目 | 说明 |
|------|------|
| OAuth token **不能**用于 `api.openai.com` | 标准 OpenAI API 只接受 API Key |
| OAuth token 用于 Codex Responses API | `https://chatgpt.com/backend-api/codex/responses` |
| 请求格式不同 | 需要从 Chat Completions 格式转换为 Responses API 格式 |
| OpenAI 不开放第三方 OAuth 注册 | 所有第三方项目都复用 Codex CLI 的 client_id |

## OAuth 参数

| 参数 | 值 | 来源 |
|------|------|------|
| Client ID | `app_EMoamEEZ73f0CkXaXp7hrann` | Codex CLI 源码 (`codex-rs/login/src/auth/manager.rs`) |
| Authorization URL | `https://auth.openai.com/oauth/authorize` | OpenAI Auth0 |
| Token URL | `https://auth.openai.com/oauth/token` | OpenAI Auth0 |
| Redirect URI | `http://localhost:1455/auth/callback` | Codex CLI 注册的固定回调地址 |
| Scopes | `openid profile email offline_access` | 基础身份 + 离线刷新 |
| PKCE Method | S256 | 标准 PKCE |

### 关键额外参数

| 参数 | 值 | 作用 |
|------|------|------|
| `codex_cli_simplified_flow` | `true` | **跳过组织选择页面**（最重要） |
| `id_token_add_organizations` | `true` | 将组织信息写入 token，不额外提示 |
| `originator` | `aios` | 标识调用来源 |

## 完整 OAuth 流程

```
┌──────────┐     ┌──────────┐     ┌───────────────┐     ┌──────────────┐
│  Frontend │     │  Backend │     │ localhost:1455 │     │ auth.openai  │
│  (浏览器)  │     │  (AIOS)  │     │  (临时服务器)   │     │   .com       │
└────┬─────┘     └────┬─────┘     └───────┬───────┘     └──────┬───────┘
     │                │                    │                     │
     │ 1. GET /api/auth/openai/authorize   │                     │
     │───────────────>│                    │                     │
     │                │ 2. 生成 PKCE + state                     │
     │                │ 3. 启动临时 HTTP 服务器                    │
     │                │──────────────────>│                     │
     │                │                    │ (监听 127.0.0.1:1455)│
     │  4. 返回 authorizationUrl           │                     │
     │<───────────────│                    │                     │
     │                │                    │                     │
     │ 5. 打开新标签页跳转到 OpenAI 登录页   │                     │
     │─────────────────────────────────────────────────────────>│
     │                │                    │                     │
     │                │                    │  6. 用户登录并授权    │
     │                │                    │                     │
     │                │                    │ 7. OpenAI 回调       │
     │                │                    │<────────────────────│
     │                │                    │ GET /auth/callback   │
     │                │                    │ ?code=xxx&state=xxx  │
     │                │                    │                     │
     │                │  8. Promise resolve │                     │
     │                │<──────────────────│                     │
     │                │                    │                     │
     │ 9. POST /api/auth/openai/poll (轮询) │                     │
     │───────────────>│                    │                     │
     │                │ 10. 用 code 换 token │                     │
     │                │──────────────────────────────────────────>│
     │                │ POST /oauth/token   │                     │
     │                │ {code, code_verifier}│                    │
     │                │<─────────────────────────────────────────│
     │                │ {access_token, refresh_token}             │
     │                │                    │                     │
     │                │ 11. 从 JWT 提取 accountId                 │
     │                │ 12. 存储 token 到数据库                    │
     │                │                    │                     │
     │  13. 返回 status: "complete"         │                     │
     │<───────────────│                    │                     │
```

### 详细步骤

#### 1. 发起授权 (`GET /api/auth/openai/authorize`)

- 生成 32 字节随机 PKCE `code_verifier`，SHA-256 哈希得到 `code_challenge`
- 生成 24 字节随机 `state` 防止 CSRF
- 在 `127.0.0.1:1455` 启动临时 HTTP 服务器等待回调
- 返回完整的授权 URL

#### 2. 用户登录

- 前端打开新标签页跳转到 `https://auth.openai.com/oauth/authorize?...`
- 用户在 OpenAI 登录页面输入账号密码
- `codex_cli_simplified_flow=true` 参数跳过组织选择步骤

#### 3. 回调捕获

- OpenAI 登录成功后重定向到 `http://localhost:1455/auth/callback?code=xxx&state=xxx`
- 临时服务器接收到请求，验证 `state`，提取 `code`
- 向用户返回 "Authorization Successful" HTML 页面
- Promise resolve，服务器关闭

#### 4. 前端轮询 (`POST /api/auth/openai/poll`)

- 前端每 1.5 秒轮询一次
- 使用 `Promise.race` 与 200ms 超时竞争，实现非阻塞检查
- 回调到达后，用授权码换取 token

#### 5. Token 交换

```json
POST https://auth.openai.com/oauth/token
{
  "grant_type": "authorization_code",
  "client_id": "app_EMoamEEZ73f0CkXaXp7hrann",
  "code": "<authorization_code>",
  "redirect_uri": "http://localhost:1455/auth/callback",
  "code_verifier": "<pkce_verifier>"
}
```

返回：

```json
{
  "access_token": "<JWT>",
  "refresh_token": "<token>",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

#### 6. 提取 Account ID

access_token 是 JWT 格式，解码 payload 后提取：

```javascript
payload["https://api.openai.com/auth"].chatgpt_account_id
```

此 `accountId` 在调用 Codex API 时作为 `chatgpt-account-id` 请求头必须携带。

#### 7. Token 自动刷新

- 每次 LLM 请求前检查 token 是否在 5 分钟内过期
- 过期则自动刷新：

```json
POST https://auth.openai.com/oauth/token
{
  "grant_type": "refresh_token",
  "client_id": "app_EMoamEEZ73f0CkXaXp7hrann",
  "refresh_token": "<refresh_token>"
}
```

## Codex Responses API 适配

### 为什么不能用标准 API

OAuth token 是通过 ChatGPT/Codex 登录获得的，绑定的是用户的 ChatGPT 订阅（Plus/Pro），不是 API 额度。因此只能调用 Codex 专属端点。

### API 端点

```
POST https://chatgpt.com/backend-api/codex/responses
```

### 请求头

```
Authorization: Bearer <access_token>
chatgpt-account-id: <account_id>
OpenAI-Beta: responses=experimental
Content-Type: application/json
```

### 请求格式转换

**Chat Completions 格式（AIOS 内部使用）：**

```json
{
  "model": "gpt-4.1-mini",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" },
    { "role": "user", "content": "What is 2+2?" }
  ],
  "tools": [{ "type": "function", "function": { "name": "...", ... } }]
}
```

**Codex Responses API 格式（实际发送）：**

```json
{
  "model": "gpt-4.1-mini",
  "instructions": "You are a helpful assistant.",
  "input": [
    {
      "type": "message",
      "role": "user",
      "content": [{ "type": "input_text", "text": "Hello" }]
    },
    {
      "type": "message",
      "role": "assistant",
      "content": [{ "type": "output_text", "text": "Hi there!" }]
    },
    {
      "type": "message",
      "role": "user",
      "content": [{ "type": "input_text", "text": "What is 2+2?" }]
    }
  ],
  "store": false,
  "stream": true,
  "tools": [{ "type": "function", "name": "...", "description": "...", "parameters": {} }]
}
```

#### 转换规则

| Chat Completions | Responses API |
|------------------|---------------|
| `messages[role=system].content` | `instructions` 字段 |
| `messages[role=user].content` | `input[].content[].type = "input_text"` |
| `messages[role=assistant].content` | `input[].content[].type = "output_text"` |
| `messages[role=assistant].tool_calls` | `input[].content[].type = "function_call"` |
| `messages[role=tool]` | `input[].type = "function_call_output"` |
| `tools[].function` | `tools[]` (扁平化，type/name/description/parameters 同级) |
| `stream: true` | `stream: true` |
| *(无)* | `store: false` (必须) |

### SSE 响应格式

Codex Responses API 返回的 SSE 事件类型：

| 事件类型 | 含义 | 对应 Chat Completions |
|---------|------|---------------------|
| `response.output_text.delta` | 文本增量 `{ delta: "..." }` | `choices[0].delta.content` |
| `response.output_item.added` | 新输出项（文本或函数调用） | - |
| `response.function_call_arguments.delta` | 函数参数增量 | `choices[0].delta.tool_calls[].function.arguments` |
| `response.output_item.done` | 输出项完成 | - |
| `response.completed` | 响应完成 | `[DONE]` |

## 架构图

```
用户发消息 → WebSocket → chat handler → getSettings()
                                            │
                                    authMethod === "oauth"?
                                     ┌──────┴──────┐
                                    YES            NO
                                     │              │
                              resolveOAuth()   buildLlmHeaders()
                              (刷新 token)     (标准 Bearer key)
                                     │              │
                              callCodexStream()  callLlmStream()
                              ┌──────────────┐  ┌──────────────┐
                              │ 格式转换:      │  │ 标准 Chat     │
                              │ Chat → Responses│ │ Completions   │
                              │ 发送到:        │  │ api.openai.com│
                              │ chatgpt.com/   │  │ (或其他供应商) │
                              │ backend-api/   │  │              │
                              │ codex/responses│  │              │
                              └──────┬─────────┘ └──────┬───────┘
                                     │              │
                              SSE 解析 +        SSE 解析
                              格式转换回         (标准格式)
                              Chat Completions
                                     │              │
                                     └──────┬───────┘
                                            │
                                     返回统一格式:
                                     { role, content, tool_calls? }
```

## 涉及的文件

| 文件 | 职责 |
|------|------|
| `server/api/auth/openai-oauth.js` | OAuth 流程：授权、回调、token 交换、刷新、断开 |
| `server/llm/codex.js` | Codex Responses API 适配器：格式转换 + SSE 解析 |
| `server/llm/common.js` | `resolveOAuth()` 判断是否走 Codex 路径，自动刷新 token |
| `server/llm/stream.js` | 流式调用入口，路由到 Codex 或标准 API |
| `server/llm/regular.js` | 非流式调用入口，同上 |
| `server/service/settings/get.js` | Settings 增加 `authMethod`, `oauthAccessToken`, `oauthAccountId` 等字段 |
| `server/api/settings.js` | GET 响应隐藏 OAuth token，只暴露 `oauthConnected` 状态 |
| `ui/src/data/providers.js` | OpenAI provider 添加 `supportsOAuth: true` |
| `ui/src/views/WelcomeView.vue` | Welcome Step 3 添加 OAuth 登录选项 |
| `ui/src/apps/settings/ModelTab.vue` | 设置页添加 OAuth 切换和手动 Token 输入 |

## 数据库存储 (settings 表)

| Key | 说明 | 示例 |
|-----|------|------|
| `authMethod` | 认证方式 | `"oauth"` 或 `"apikey"` |
| `oauthAccessToken` | JWT access token | `"eyJhbGciOi..."` |
| `oauthAccountId` | ChatGPT 账号 ID（从 JWT 提取） | `"acct_xxx"` |
| `oauthRefreshToken` | 刷新 token | `"rt_xxx"` |
| `oauthTokenExpiresAt` | 过期时间戳 (ms) | `"1719849600000"` |

## 限制

1. **仅限本地部署** — redirect_uri 是 `localhost:1455`，远程服务器部署时浏览器的 localhost 不是服务器
2. **依赖 Codex client_id** — OpenAI 未开放第三方 OAuth 注册，使用 Codex 的公开 client_id
3. **模型受限** — 只能使用 Codex 支持的模型（如 gpt-4.1-mini 等），取决于用户的 ChatGPT 订阅等级
4. **授权页显示 "Codex"** — 因为复用了 Codex 的 OAuth 客户端

## 参考项目

| 项目 | 链接 | 说明 |
|------|------|------|
| OpenAI Codex CLI | https://github.com/openai/codex | client_id 和 OAuth 流程的来源 |
| OpenClaw | https://github.com/openclaw/openclaw | 完整的 Codex OAuth 集成参考 |
| pi-mono (badlogic) | https://github.com/badlogic/pi-mono | OpenClaw 底层的 OAuth 实现库 |
| openai-oauth | https://github.com/EvanZhouDev/openai-oauth | Chat Completions → Codex Responses 代理 |
| codex-proxy | https://github.com/icebear0828/codex-proxy | 多格式 Codex 代理 |
