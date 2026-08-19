# Settings

运行配置保存在 SQLite 的 `settings` 表中，采用简单的 KV 结构：

```sql
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

`value` 统一以文本保存，Repository 负责数值转换和校验。默认值由根目录的 `schema.sql` 使用 `INSERT OR IGNORE` 初始化，因此升级时会补充新增配置，但不会覆盖用户已经保存的值。

AGENT 本身没有账号或登录状态，也不绑定特定模型供应商。首次启动时 `llm.responses_url`、`llm.model` 和 `llm.key` 均为空；用户需要在设置页填写完整的 Responses API 地址、密钥和模型名称。地址必须包含最终端点路径，例如 `https://example.com/v1/responses`；LLM 适配层直接请求该地址，不会追加路径。密钥为空时 LLM 适配层会直接返回配置错误，不会发送模型请求。

## Key 数量

当前共有 **9 个 key**：

- 模型配置：3 个
- 上下文配置：4 个
- 提示词配置：2 个

## 模型配置

| Key | 默认值 | 说明 |
| --- | --- | --- |
| `llm.responses_url` | 空 | 完整的 Responses API 地址；直接请求该地址，不追加任何路径 |
| `llm.key` | 空 | 模型服务密钥；请求时通过 `Authorization: Bearer` 发送，未配置时拒绝运行 |
| `llm.model` | 空 | 请求使用的模型名称；为空时由模型服务决定 |

## 上下文配置

| Key | 默认值 | 说明 |
| --- | --- | --- |
| `context.window` | `1048576` | 模型上下文窗口 token 数 |
| `context.reserve` | `16000` | 距离窗口上限多少 token 时开始压缩 |
| `context.keep_recent` | `20000` | 压缩后保留的最近原始上下文 token 数 |
| `context.live_result_chars` | `8000` | 发送给模型的单条工具结果最大字符数 |

## 提示词配置

| Key | 说明 |
| --- | --- |
| `prompt.chat` | 普通对话的基础提示词；Runtime 会在后面追加执行对话归属规则 |
| `prompt.compaction` | 压缩历史上下文时使用的完整提示词 |

压缩摘要保存在 `compactions` 表，不写入 `items`。组装模型请求时，Runtime 会将摘要临时转换为 `role=system` 的 message 放入 Responses API input。

`prompt.chat` 支持两个运行时占位符：

- `{{chat_id}}`：当前对话 ID
- `{{api_url}}`：当前 Agent HTTP API 地址

占位符会在启动本轮 Agent 之前替换。`prompt.compaction` 当前不提供占位符。

## API

读取全部有效配置：

```text
GET /api/settings
```

设置一个配置：

```text
PUT /api/settings/:key
Content-Type: application/json

{ "value": "新的值" }
```

`llm.key` 不会通过读取接口返回明文。接口只返回空值和 `configured` 状态，设置页面中的密钥留空时会保留原值。

数值配置必须是正数。未知 key 会被拒绝，避免拼写错误产生无效配置。

模型请求不设置 `max_output_tokens`，Runtime 不设置内部请求超时，Agent 工具循环也没有最大步数。运行只会在模型正常结束、用户主动停止或请求报错时结束。

## 不在 Settings 中的启动参数

以下两项必须在 SQLite 打开和 HTTP 服务监听之前确定，因此不能从 `settings` 表读取：

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `9522` | HTTP 服务监听端口 |
| `DB_PATH` | `data/agent.db` | SQLite 数据库文件路径 |

除这两个启动参数外，模型、上下文和提示词配置均来自 `settings` 表。
