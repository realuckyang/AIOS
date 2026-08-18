# Userland

内核之外的一切能力都是约定:模型用 bash 调框架 API,把脚本、文件和对话组合成自己需要的机制。约定没有内核背书——它可以失败、可以乱,代价是自律,收益是内核永远不用为新能力加东西。

内核给模型的固定指令只需要说清三件事:API 的地址与用法、`source=runtime` 的约定、以及「你的水位会被注入,遗忘靠拨指针」。其余全部由模型现场发挥。

## 子 agent

「子 agent」不是概念,只是由另一条对话创建并调用的对话。

派生:

```bash
curl -s -X POST http://127.0.0.1:9522/api/chats \
  -d '{ "title": "worker: 跑测试", "description": "worker of chat abc123",
        "message": { "content": "任务说明……做完把结果 POST 回对话 abc123,source 用 runtime", "source": "runtime" } }'
```

- 回写约定由创建者写进任务里:子对话结束前用 curl 往父对话发一条 `source=runtime` 消息,消息唤醒空闲的父对话。
- 继续调用已有对话 = 再发一条消息,没有专门的「调用」操作。
- 父子关系不进 schema;想让 UI 能分组,就按约定把归属写进 `description`。
- 干完活的 worker 由创建者按约定 DELETE,不留尾巴。

## 失败监控

框架层失败(模型请求报错、被停止)时子对话没有机会执行回写。关心子对话死活的一方自己派 watcher:

```bash
setsid sh -c '
  while [ "$(curl -s http://127.0.0.1:9522/api/chats/$CHILD | jq -r .status)" = running ]; do sleep 10; done
  curl -s -X POST http://127.0.0.1:9522/api/chats/$PARENT/messages \
    -d "{\"content\":\"子对话 $CHILD 已结束,请检查结果\",\"source\":\"runtime\"}"
' &
```

监控是能力,不是内核义务。

## 通知自己 / 定时

唤醒原语只有一个:往对话发消息——包括往自己的对话发。

```bash
setsid sh -c 'make build > build.log 2>&1; curl -s -X POST .../api/chats/$SELF/messages \
  -d "{\"content\":\"构建结束,日志在 build.log\",\"source\":\"runtime\"}"' &
```

长任务、轮询、监听、定时(sleep 或 crontab)全部归约为这个形状。stop 杀进程组,setsid 逃逸的后台进程刻意存活——这既是「通知自己」的前提,也意味着孤儿进程由约定管理(记录 PID、写日志文件)。

## 压缩

压缩 = 感知 + 生成 + 遗忘。前两件在 userland,只有遗忘用内核指针:

1. **感知**:内核每轮注入水位,模型自己决定何时压、压多狠。
2. **生成**:从 SQLite 或 `/items` 捞历史,开一条子对话按本次需要的角度做摘要——这次保留架构决定,那次保留未完成的坑。压缩指令每次现写,不是固定 prompt。摘要 POST 回自己的对话,或落文件、对话里只留指针。给未来的自己留言:「你已经忘了 X,细节在 notes.md」。
3. **遗忘**:`PATCH /api/chats/:id` 把 `context_start_item_id` 拨到摘要之后。

压缩和记忆在此合流:给未来自己的留言就是记忆,只是带着截止日期。

## 记忆

bash 能读写文件,记忆就是目录加约定;召回就是 grep。也可以用一条常驻对话当记忆体,问它就是发消息。内核不知道记忆的存在。

## 技能

技能 = 放在文件里的指令 + 触发约定,加载就是 cat。一个目录规范即可,内核不参与。

## Workflow

编排 = 一个脚本(或一条专门做编排的对话)按拓扑创建对话、等消息回流。fan-out、pipeline、判分、重试都是脚本层的事。

## 自我修改

提示词和配置是数据,agent 能通过配置接口或直接改文件修改——包括自己的系统提示词。这是平凡推论,不是特殊能力,但要认账:

- 配置是全局的,改坏了所有对话一起坏,且改坏后可能失去自救能力(连 API key 都能改哑)。
- 逃生通道是人机平权:人类始终能直接改配置文件和 SQLite。
- 谨慎的约定:改 prompt 前先备份到文件。

## 原则

- 内核提供机制,userland 提供策略;判断标准是背后有没有物理现实。
- 结构存在于约定和 transcript 里,不进 schema;约定坏了顶多显示得难看,内核的真相不受污染。
- 所有约定(脚本、技能文件、记忆规范)本身可以被 agent 自己写出来——这个内核的天花板不在能力,在愿意沉淀多少可靠的约定。
