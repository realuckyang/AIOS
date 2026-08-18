# Boot

`boot.js` 是运行在宿主 Node.js 上的外部 supervisor，不属于 Kernel，也不处理对话、模型或工具。

## 启动链路

```text
npm start
  → boot.js 写入 run/boot.pid
  → 启动 kernel/index.js
  → 轮询 Kernel run API，最长等待 15 秒
  → Kernel 就绪后启动 app/server/index.js
```

Boot 从 `etc/config.json` 读取 `kernelPort` 和 `appPort`，并通过环境变量把端口交给 App。Kernel 自己读取模型、工具、工作目录和超时配置。

## 故障策略

- App 退出：Kernel 保持运行，Boot 按 1、2、4 秒逐步退避，最多 60 秒，单独重启 App。
- Kernel 退出：Boot 先结束旧 App，再按相同退避重启整套服务。
- 子进程稳定运行超过 60 秒后，下一次退避恢复为 1 秒。
- 重复执行 `npm start` 时，活着的 `run/boot.pid` 会阻止第二套系统启动。

## 停止

`npm stop` 读取 `run/boot.pid`，向 Boot 发送 `SIGTERM`。Boot 先通知 App 和 Kernel 退出，最多等待 5 秒，仍未退出才强制结束。Kernel 收到停止信号时会中止当前 run，从而终止它管理的工具进程组。

PID 是可丢弃的宿主运行态；持久事实不放在 `run/`。

## 独立调试

- `npm run kernel`：绕过 Boot，只启动 Kernel，不会启动 App。
- `npm run app`：绕过 Boot，只启动 App；使用 `KERNEL_PORT`、`APP_PORT` 环境变量，未提供时分别默认 9522、9523。

独立模式不写 `boot.pid`，通过终端信号退出。

## App 重启

Boot 接收 `SIGHUP` 时只重启 App，Kernel 和已在执行的 run 保持不变。App 的重启申请必须经用户在前端确认；确认接口返回后，App 向 `run/boot.pid` 对应进程发送 `SIGHUP`。Boot 将这次退出标记为计划内停止，避免与崩溃重启退避重复触发。
