// meem 兼容的 ws store —— 暴露给 meem 移植过来的 stores (terminal/files/snippets)
// 用,但底层透传到 AIOS 的 system/ws.js (单连接 /ws,cookie 鉴权).
//
// 接口形状对齐 meem worker/src/stores/ws.js:
//   state:           'connected' | 'pending' | 'offline'
//   statusText:      展示用的中文状态
//   showActions:     是否允许操作 UI (鉴权过 + 后端可达)
//   clientId / sessionId / authenticated / requiresPassword / invalid:
//                    meem 旧 UI 兼容字段,这里直接置成"已登录单设备"
//   sendMsg(msg):           发 { type, data, [to] } —— `to` 字段在 meem 是 worker
//                           中继时的路由,AIOS 不用,但保留无害.
//   onMessage(type, fn):    单 handler / type,返回 unsubscribe.
//                           会按需在 AIOS system/ws 上挂一个分发钩子,所有同类型
//                           消息都会走到这唯一一个 handler.
//   init():                 触发 AIOS WS 连接 + 同步状态
//   submitPassword:         no-op (AIOS 鉴权走 /login + cookie,不在 WS 里)
//
// connection.devices/desktop=connected 是 meem 老协议. terminal store 监听这个
// 再去拉 terminal.list. AIOS WS open 时由本 store 合成一次.
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { connect, ensureConnected, on, send, wsStatus } from '../system/ws.js';

export const useWsStore = defineStore('ws', () => {
    const state = ref('pending');
    const statusText = ref('连接中...');
    const showActions = ref(false);
    const sessionId = ref('local');
    const clientId = ref('');
    const authenticated = ref(true);
    const requiresPassword = ref(false);
    const authError = ref('');
    const authClosed = ref(false);
    const superseded = ref(false);
    const invalid = ref(false);

    const handlers = new Map();
    const aiosSubscribed = new Set();
    let inited = false;

    const syncState = (s) => {
        if (s === 'connected') {
            state.value = 'connected';
            statusText.value = '已连接';
            showActions.value = true;
        } else if (s === 'connecting') {
            state.value = 'pending';
            statusText.value = '连接中...';
            showActions.value = false;
        } else {
            state.value = 'offline';
            statusText.value = '连接已断开';
            showActions.value = false;
        }
    };

    function onMessage(type, handler) {
        handlers.set(type, handler);
        if (!aiosSubscribed.has(type)) {
            aiosSubscribed.add(type);
            on(type, (msg) => handlers.get(type)?.(msg));
        }
        return () => handlers.delete(type);
    }

    function sendMsg(msg) {
        send(msg);
    }

    async function init() {
        if (inited) return;
        inited = true;

        watch(wsStatus, (s) => {
            const prev = state.value;
            syncState(s);
            // AIOS 这里没有 worker 中继,desktop 概念 == 后端本身.
            // 状态从非 connected 变 connected 时合成一次 connection.devices,
            // 让 meem terminal store 触发它的 requestTerminalList().
            if (s === 'connected' && prev !== 'connected') {
                handlers.get('connection.devices')?.({
                    type: 'connection.devices',
                    data: { devices: { desktop: 'connected' } }
                });
            }
        }, { immediate: true });

        connect();
        await ensureConnected().catch(() => {});
    }

    async function submitPassword() {
        // AIOS 鉴权由 /login 路由 + cookie 处理,不在 WS 里.
    }

    return {
        state, statusText, showActions,
        sessionId, clientId, authenticated, requiresPassword,
        authError, authClosed, superseded, invalid,
        init, sendMsg, onMessage, submitPassword,
    };
});
