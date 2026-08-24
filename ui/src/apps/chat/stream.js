// chat 域的 WS 事件适配层
// ─────────────────────────────────────────
// 不创建新连接 — 跑在 @/system/ws.js 全局连接之上,
// 把 delta/done/tool_call/tool_result/aborted/error 翻译成
// chat 内部对 messages / streaming / streamingKey 的操作.
//
// 用法:
//   const stop = setupChatStream({
//     messages, activeId, streaming, streamingKey,
//     onAfterDone: () => loadConversations(),
//     scrollEnd: () => ...,
//   });
//   onBeforeUnmount(stop);

import { on } from '@/system/ws.js';

// ─── pure helpers ───────────────────────────────────
export const mkKey = (kind) => `ws:${Date.now()}:${kind}`;

const parseToolArgs = (raw) => {
    if (typeof raw !== 'string') return null;
    try { return JSON.parse(raw); } catch { return null; }
};

export function mapToolCall(tc, key) {
    const name = tc?.function?.name || '';
    const args = parseToolArgs(tc?.function?.arguments);
    if (name === 'shell' && args) {
        return {
            type: 'tool_call', shell: true,
            title: args.reason || 'shell',
            command: args.command || '',
            _key: key, expanded: false
        };
    }
    return {
        type: 'tool_call',
        title: name || '工具调用',
        detail: args ? JSON.stringify(args, null, 2) : '',
        _key: key, expanded: false
    };
}

// 把 /api/chat/messages 拿到的原始消息数组解析成 UI 可渲染列表
export function parseMessages(raw) {
    const list = [];
    for (const m of raw) {
        if (!m || m.role === 'system') continue;
        const base = m._id != null ? `db:${m._id}` : null;

        // assistant 同时有 tool_calls — 拆成正文气泡 + 多条 tool_call
        if (m.role === 'assistant' && m.tool_calls?.length) {
            if (m.content) list.push({ role: 'ai', text: m.content, _key: base ? `${base}:asst` : undefined });
            m.tool_calls.forEach((tc, i) => list.push(mapToolCall(tc, base ? `${base}:tc:${i}` : undefined)));
            continue;
        }
        // tool 角色 — 回填到上一条没结果的 tool_call
        if (m.role === 'tool') {
            for (let i = list.length - 1; i >= 0; i--) {
                if (list[i].type === 'tool_call' && !list[i].result) {
                    list[i].result = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
                    break;
                }
            }
            continue;
        }
        // 普通 assistant 文本
        if (m.role === 'assistant' && m.content) {
            list.push({
                role: 'ai',
                text: m.content,
                remark: m._remark || null,
                _key: base ? `${base}:asst` : undefined
            });
            continue;
        }
        // 用户消息
        if (m.role === 'user' && m.content) {
            const text = typeof m.content === 'string'
                ? m.content
                : Array.isArray(m.content) ? m.content.map((p) => p.text || '').filter(Boolean).join('\n') : '';
            list.push({ role: 'user', text, _key: base ? `${base}:user` : undefined });
        }
    }
    return list;
}

// ─── stream lifecycle ───────────────────────────────
// 注册全部 WS 处理器, 返回 unsubscribe (聚合调用所有 unsub)
export function setupChatStream({
    messages, activeId, streaming, streamingKey,
    onAfterDone, scrollEnd
}) {
    const isCurrent = (d) => d.conversationId === activeId.value;
    const isCurrentOrGlobal = (d) => !d.conversationId || d.conversationId === activeId.value;

    // 收尾正在流式中的 AI 气泡: 有内容就锁定, 没内容就直接删掉
    function closeStreaming(finalText, remark) {
        const key = streamingKey.value;
        streamingKey.value = '';
        if (!key) return;
        const idx = messages.value.findIndex((m) => m._key === key);
        if (idx < 0) return;
        const msg = messages.value[idx];
        if (finalText) msg.text = finalText;
        if (remark) msg.remark = remark;
        delete msg._streaming;
        if (!msg.text) messages.value.splice(idx, 1);
    }

    const unsubs = [
        on('delta', (d) => {
            if (!isCurrent(d)) return;
            streaming.value = true;
            if (!d.delta) return;  // 空 delta 不开气泡
            let key = streamingKey.value;
            if (!key) {
                key = mkKey('asst');
                streamingKey.value = key;
                messages.value.push({ role: 'ai', text: '', _key: key, _streaming: true });
            }
            const msg = messages.value.find((m) => m._key === key);
            if (msg) msg.text = (msg.text || '') + d.delta;
            scrollEnd?.();
        }),

        on('done', (d) => {
            if (!isCurrent(d)) return;
            if (streamingKey.value) {
                closeStreaming(d.content, d.remark);
            } else if (d.content) {
                // 没有 streaming 占位但 done 带最终内容 → 直接新建一条
                messages.value.push({
                    role: 'ai',
                    text: d.content,
                    remark: d.remark || null,
                    _key: mkKey('done')
                });
            }
            streaming.value = false;
            scrollEnd?.();
            onAfterDone?.();
        }),

        on('tool_call', (d) => {
            if (!isCurrent(d)) return;
            closeStreaming();
            messages.value.push(mapToolCall(d.toolCall, mkKey('tc')));
            scrollEnd?.();
        }),

        on('tool_result', (d) => {
            if (!isCurrent(d)) return;
            for (let i = messages.value.length - 1; i >= 0; i--) {
                const msg = messages.value[i];
                if (msg.type === 'tool_call' && !msg.result) { msg.result = d.content; return; }
            }
            messages.value.push({ type: 'tool_result', content: d.content, _key: mkKey('tr') });
        }),

        on('aborted', (d) => {
            if (!isCurrent(d)) return;
            closeStreaming();
            streaming.value = false;
        }),

        on('error', (d) => {
            if (!isCurrentOrGlobal(d)) return;
            closeStreaming();
            messages.value.push({ role: 'ai', text: `[错误] ${d.content || '未知错误'}`, _key: mkKey('err') });
            streaming.value = false;
        })
    ];

    return () => unsubs.forEach((fn) => fn?.());
}
