# 内核接口

接口是读写不对称的:**读走文件,写走 API**。这个不对称不是妥协,是准确——读是无副作用的观测,谁都可以直接看;写要触发调度,必须经过持有调度器的内核进程。与「读 /proc 不 syscall、写状态必 syscall」同构。

## 读:文件系统

`data/chats/<id>/meta.json` 和 `items.jsonl` 直接可读,cat/grep/jq 即查询。这是 agent 和 userland 服务的主要读路径。

只读 HTTP 路由继续存在,服务浏览器;对 agent 只是可选便利。

## 写:HTTP API

内核进程是 data/ 的唯一写者;一切写入和控制必须经过 API。直接 `echo >> items.jsonl` 既破坏单写者,又不会唤醒任何东西。

服务只监听 `127.0.0.1`。UI、agent、人类共用同一套 API——单一真相压倒 bash 亲和:两个写入口就是两套 bug。

```text
GET    /api/chats                 列出对话(服务浏览器;agent 可直接扫目录)
POST   /api/chats                 创建对话(可带首条消息,立即后台运行)
GET    /api/chats/:id             获取对话
PATCH  /api/chats/:id             修改 title、description、context_start
DELETE /api/chats/:id             停止并删除对话
POST   /api/chats/:id/stop        停止当前运行
GET    /api/chats/:id/items       列出消息(服务浏览器)
POST   /api/chats/:id/messages    写入消息;对话空闲则自动运行
```

`POST /messages` 请求体:

```json
{ "content": "...", "source": "user" }
```

- `source` 只允许 `user` 或 `runtime`,必填。人类前端发 `user`;对话之间、脚本回传发 `runtime`。
- 写入即返回;运行在后台。这是内核唯一的唤醒原语。
- `PATCH` 修改 `context_start` 即执行遗忘,这是压缩约定唯一依赖的内核写接口。

没有 `/calls`、`/created-chats` 或任何对话间专用路由。派生、调用、回传、监控都是对普通接口的组合使用(见 userland.md)。

## 事件:SSE

```text
GET    /api/events                SSE 订阅(浏览器用)
```

事件类型:`status`、`input`、`reasoning`、`message`、`tool_calls`、`tool_results`、`done`、`error`(瞬时,不落 items)、`gap`。

- 全局事件 ID 递增;断线用 `Last-Event-ID` 补发;补不齐发 `gap`,客户端全量重拉。
- 抛出是 fire-and-forget 的:内核不认识消费方,零订阅者照常运转;事件易逝,文件才是事实。SSE 断开不影响运行。
- 消费方是 userland 服务(UI 渲染、索引增量、watcher 面板);agent 不订阅——agent 的「事件」就是被消息唤醒本身。

四条通道各干一件事,全部单向:**写入靠 syscall(API),事实靠文件,通知靠事件,调度靠唤醒**。

## 糖:userland 的 libc

curl + JSON 转义的人体工学问题不在内核解决。agent 觉得 curl 啰嗦,就给自己写 CLI 包装脚本(`agent-cli send <chat> "..."`)——syscall 永远只有一套且难看,libc 是用户态的糖,由 agent 自产自销。内核最多在固定指令里附赠一个默认包装脚本的路径,作为预装的 libc。

注意区分两个 CLI:内核自带的 `console`(tty 逃生通道,人写、冻结,见 kernel.md)服务于人类;agent 自写的包装脚本服务于它自己。两者都是内核 API 的客户端,谁都不是第二个写入口。

## 固定指令

内核注入给模型的固定指令只说清四件事:API 的地址与用法、`source=runtime` 的约定、「你的水位会被注入、遗忘靠拨指针」、以及默认 libc 的位置。其余全部由模型现场发挥。这段指令是内核机制与 userland 约定之间唯一的桥,措辞质量直接决定约定能否自发运转。
