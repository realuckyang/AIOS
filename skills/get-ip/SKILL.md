---
name: 获取 IP
description: 获取本机公网出口 IP 和本地局域网 IP 地址
---

# 获取 IP

获取本机的公网 IP 和本地 IP 地址。

## 使用方式

### 公网 IP

```bash
bash skills/get-ip/scripts/public-ip.sh
```

返回你的公网出口 IP（通过多个 DNS 服务商查询，兜底用 curl）。

### 本地 IP

```bash
bash skills/get-ip/scripts/local-ip.sh
```

返回本机所有活跃网络接口的 IP 地址。

## 依赖

- `curl`
- `dig`（可选，用于 DNS 方式查询公网 IP）
- 标准 Unix 工具（`ifconfig` / `ip`）
