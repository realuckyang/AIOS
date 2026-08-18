# Userland

内核之外的一切能力都是约定:模型用 bash 调内核 API、直读 data/ 文件,把脚本、文件和对话组合成自己需要的机制。约定没有内核背书——它可以失败、可以乱,代价是自律,收益是内核永远不用为新能力加东西。

userland 同时是一个**进程**:由 init 拉起,承载默认 UI 和 agent 现写的一切服务端造物。它可以被 agent 改写、重启、弄崩,内核不受影响。

## 子 agent

「子 agent」不是概念,只是由另一条对话创建并调用的对话。父子关系不进内核数据——它记录在创建者的 transcript 里;想让 UI 能分组,按约定写进 `description`(如 `worker of chat X`)。

- 派生:`POST /api/chats`,任务写进首条消息,连同回写约定:「做完把结果 POST 回对话 X,source 用 runtime」。
- 回写:子对话结束前 curl 父对话;消息唤醒空闲的父对话。
- 继续调用已有对话 = 再发一条消息,没有专门的「调用」操作。
- 干完活的 worker 由创建者按约定 DELETE,不留尾巴。

## 失败监控

框架层失败(模型请求报错、被停止)时子对话没有机会回写。关心子对话死活的一方自己派 watcher:

```bash
setsid sh -c '
  while [ "$(curl -s $API/chats/$CHILD | jq -r .status)" = running ]; do sleep 10; done
  curl -s -X POST $API/chats/$PARENT/messages \
    -d "{\"content\":\"子对话 $CHILD 已结束,请检查结果\",\"source\":\"runtime\"}"
' &
```

监控是能力,不是内核义务。

## 通知自己 / 定时

唤醒原语只有一个:往对话发消息——包括往自己的对话发。长任务、轮询、监听、定时(sleep 或 crontab)全部归约为:

```bash
setsid sh -c 'make build > build.log 2>&1; curl -s -X POST $API/chats/$SELF/messages \
  -d "{\"content\":\"构建结束,日志在 build.log\",\"source\":\"runtime\"}"' &
```

stop 杀进程组,setsid 逃逸的后台进程刻意存活——这既是「通知自己」的前提,也意味着孤儿进程由约定管理(记录 PID、写日志文件)。

## 压缩

压缩 = 感知 + 生成 + 遗忘。前两件在 userland,只有遗忘用内核指针:

1. **感知**:内核每轮注入水位,模型自己决定何时压、压多狠。
2. **生成**:直读 items.jsonl 捞历史,开一条子对话按本次需要的角度做摘要——压缩指令每次现写,不是固定 prompt。摘要 POST 回自己的对话,或落文件、对话里只留指针。给未来的自己留言:「你已经忘了 X,细节在 notes.md」。
3. **遗忘**:`PATCH /api/chats/:id` 把 `context_start` 拨到摘要之后。

压缩和记忆在此合流:给未来自己的留言就是记忆,只是带着截止日期。

## 记忆 / 技能 / Workflow

- **记忆**:目录加约定,召回就是 grep;或用一条常驻对话当记忆体。内核不知道记忆的存在。
- **技能**:放在文件里的指令 + 触发约定,加载就是 cat。
- **workflow**:一个脚本(或一条专门做编排的对话)按拓扑创建对话、等消息回流。fan-out、pipeline、判分、重试都是脚本层的事。

## 读模型:SQL 是按需派生的索引

UI 的扁平列表和单对话 items 流,JSONL 直读就够。全文搜索、跨对话统计需要时,**建索引本身就是 agent 的 userland 工作**:写脚本把 JSONL 灌进一个 SQLite,坏了删掉重灌,schema 随便改,内核毫发无损。索引服务可以订阅 SSE 做实时增量灌入——它和 UI 一样,是内核事件流的一个消费方。读模型不是架构的一层,是 agent 按需长出来的一个造物,和技能、仪表盘同级。内核格式是 ABI;一切聪明的查询结构都在 ABI 之上。

## UI:默认发行物,agent 可演化

默认对话浏览器是 userland 进程的一部分——地位相当于发行版预装的桌面环境,agent 可以改、可以换、可以重写:

- **形态**:扁平对话列表(标题、描述、状态、更新时间);对话视图(user 右侧气泡,model 左侧,runtime 折叠;流式增量;水位与用量;指针之前的历史仍展示但标记「已不在上下文中」);可并排只读打开任意对话;设置页编辑库外配置。
- **buildless**:原生 ES modules,改完即刷新即生效。UI 是要被 agent 频繁改写的活物,「无 build 步骤」比框架生态更值钱。
- **结构展示靠约定**:分组、过滤 worker,解析的是 `description` 约定,不是 schema。约定的两端(agent 写入的结构、UI 解析的结构)由同一个作者维护。
- **升级流程**:agent 改完代码,kill userland 进程,init 拉起新版。改之前 git commit,回滚能力自己维护。
- UI 不必是「一个」:agent 可以为某个 workflow 现场生成专用仪表盘页面,任务结束就删。界面是和脚本同级的造物。

人类的兜底交互不依赖这里——那是内核 CLI console 的职责。理论上系统可以从纯内核创世:kernel + 终端起步,人在 console 里让 agent 给自己造出整个 userland。默认发行的 UI 只是出厂便利,不是必需品。

## 自我修改

提示词和配置是数据,agent 能改——包括自己的系统提示词和 UI。这是平凡推论,不是特殊能力,但要认账:

- 配置是全局的,改坏了所有对话一起坏,且改坏后可能失去自救能力(连 API key 都能改哑)。
- 逃生通道是人机平权:人类始终能直接改配置文件、data/ 文件,以及从 console 观测。
- 谨慎的约定:改 prompt 和 UI 前先 git commit / 备份。

## 原则

- 内核提供机制,userland 提供策略;判断标准是背后有没有物理现实。
- 结构存在于约定和 transcript 里,不进内核数据;约定坏了顶多显示得难看,内核的真相不受污染。
- 所有约定(脚本、技能、记忆规范、UI)本身可以被 agent 自己写出来。
