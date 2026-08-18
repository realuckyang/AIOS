# HTTP API

UI 和 agent 共用同一套 API,人机平权。服务只监听 `127.0.0.1`。

v1 的 `/calls`、`/created-chats` 路由全部移除。对话之间的操作没有专用接口——派生、调用、回传、监控都是对普通接口的组合使用(见 userland.md)。

## 对话

```text
GET    /api/chats                 列出对话
POST   /api/chats                 创建对话
GET    /api/chats/:id             获取对话
PATCH  /api/chats/:id             修改 title、description、context_start_item_id
DELETE /api/chats/:id             停止并删除对话
POST   /api/chats/:id/stop        停止当前运行
```

- 创建时可带首条消息;对话立即后台运行。
- `PATCH` 修改 `context_start_item_id` 即执行遗忘;这是压缩约定唯一依赖的内核接口。
- 内核不区分「谁创建的对话」;列表是扁平的,结构约定写在 `description` 里。

## 消息

```text
GET    /api/chats/:id/items       列出消息
POST   /api/chats/:id/messages    写入消息;对话空闲则自动运行
```

`POST /messages` 请求体:

```json
{ "content": "...", "source": "user" }
```

- `source` 只允许 `user` 或 `runtime`,必填。人类前端发 `user`;对话之间、脚本回传发 `runtime`。
- 写入即返回消息 ID;运行在后台。这是内核唯一的唤醒原语。

## 事件

```text
GET    /api/events                SSE 订阅(全应用一条连接)
```

事件类型:

```text
status         对话 idle/running 变化
input          输入消息落库(user / runtime)
reasoning      流式推理增量
message        流式消息增量与定稿
tool_calls     bash 调用
tool_results   bash 结果
done           一轮运行结束
error          瞬时错误(不落 items)
gap            补发失败,客户端全量重拉
```

- 全局事件 ID 递增;断线用 `Last-Event-ID` 补发;补不齐发 `gap`。
- SSE 断开不影响运行;数据库是最终事实。

## 配置

配置在库外(文件或 env),不属于内核数据模型。是否暴露 `/api/settings` 读写接口是实现便利问题;若暴露,它修改的是环境,不是对话数据,agent 因此也能改自己的提示词(见 userland.md 自我修改)。
