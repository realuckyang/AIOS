// 老 desktop 时代的 core/ws shim — 桥接到新框架的全局 hub
// 老 API:
//   send({type, to, data})        — 任意消息(to: 'web' | 'web:<clientId>')
//   broadcast(type, data)         — 广播给所有 web 客户端
//   sendToClient(clientId, type, data) — 发给单个客户端
const hub = () => globalThis.__meem_ws__ || null;

const rawBroadcast = (msg) => hub()?.broadcast?.(msg);
const rawSendToClient = (clientId, msg) => hub()?.sendToClient?.(clientId, msg);

const send = (msg) => {
    if (!msg) return;
    const to = msg.to;
    if (typeof to === 'string' && to.startsWith('web:')) {
        rawSendToClient(to.slice('web:'.length), msg);
        return;
    }
    rawBroadcast(msg);
};

const broadcast = (type, data) => rawBroadcast({ type, data });
const sendToClient = (clientId, type, data) => rawSendToClient(clientId, { type, data });

const getSessionId = () => '';

module.exports = { send, sendToClient, broadcast, getSessionId };
