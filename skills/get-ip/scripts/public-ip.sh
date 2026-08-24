#!/usr/bin/env bash
# 公网出口 IP — 多源冗余查询

get_ip() {
    # 1. Cloudflare Trace
    local ip=$(curl -s --max-time 3 https://1.1.1.1/cdn-cgi/trace 2>/dev/null | grep '^ip=' | cut -d= -f2)
    if [ -n "$ip" ] && [ "$ip" != " " ]; then echo "$ip" && return 0; fi

    # 2. ipify
    ip=$(curl -s --max-time 3 https://api.ipify.org 2>/dev/null)
    if [ -n "$ip" ]; then echo "$ip" && return 0; fi

    # 3. ifconfig.me
    ip=$(curl -s --max-time 3 https://ifconfig.me 2>/dev/null)
    if [ -n "$ip" ]; then echo "$ip" && return 0; fi

    # 4. icanhazip
    ip=$(curl -s --max-time 3 https://icanhazip.com 2>/dev/null)
    if [ -n "$ip" ]; then echo "$ip" && return 0; fi

    echo "无法获取公网 IP" >&2
    return 1
}

get_ip
