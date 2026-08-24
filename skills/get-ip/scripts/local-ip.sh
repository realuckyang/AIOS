#!/usr/bin/env bash
# 本机局域网 IP — 列出所有活跃接口

if command -v ifconfig &>/dev/null; then
    ifconfig | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}'
elif command -v ip &>/dev/null; then
    ip -4 addr show scope global | grep inet | awk '{print $2}' | cut -d/ -f1
else
    echo "未找到 ifconfig 或 ip 命令"
    exit 1
fi
