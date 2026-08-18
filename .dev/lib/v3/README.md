# AIOS v3

kernel + userland 双进程的最小 agent 内核。设计见 [docs/](docs/README.md)。

- **kernel/**:冻结区,人写。data 目录单写者、消息即运行、bash、HTTP API、SSE、上下文指针、水位注入、CLI console、init。
- **userland/**:agent 可写区。默认对话浏览器(buildless)+ 预装 libc。
- **data/**:内核单写。`chats/<id>/meta.json + items.jsonl`,读走文件,写走 API。
- 配置在库外:`config.json` + `instructions.md`。全仓零 npm 依赖,无 build。

## 快速开始

需要 Node.js 22+ 和一个兼容 OpenAI Responses API 的模型服务。

```bash
cd v3
cp config.json.example config.json   # 填写 responsesUrl、apiKey、model
npm start                            # 内核 :9600,init 拉起 userland :9601
```

浏览器打开 <http://127.0.0.1:9601>,或者用 tty:

```bash
npm run console
```

## 安全说明

这个 agent 能执行命令并修改文件,只在信任的机器上运行,不要暴露到公网。`data/` 与 `config.json` 含私人数据与密钥,已被 git 忽略。
