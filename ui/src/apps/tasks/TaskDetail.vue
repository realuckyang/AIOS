<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import * as api from '@/utils/api.js';

const props = defineProps({
  task: { type: Object, required: true },
  status: { type: Object, required: true },       // { label, icon, cls }
  relTime: { type: Function, required: true }
});
defineEmits(['stop']);

const showProcess = ref(false);

const BADGE_CLS = {
  pending: 'bg-[#fef7e0] text-[#b06000]',
  running: 'bg-blue-bg text-blue-fg',
  done:    'bg-[#e6f4ea] text-good',
  error:   'bg-[#fce8e6] text-bad'
};

// ─── 任务消息流 ────────────────────────────
const messages = ref([]);
let pollTimer = null;

async function loadMessages() {
  if (!props.task?.id) return;
  try {
    const d = await api.get('/api/task/messages', { query: { id: props.task.id } });
    const items = d?.messages || [];
    messages.value = items.map((row) => {
      let parsed = null;
      try { parsed = typeof row.message === 'string' ? JSON.parse(row.message) : row.message; }
      catch { parsed = { role: 'raw', content: row.message }; }
      return { id: row.id, ts: row.created_at, ...parsed };
    });
  } catch {}
}

const stopPoll = () => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } };

watch(() => props.task?.id, (id) => {
  stopPoll();
  messages.value = [];
  if (!id) return;
  loadMessages();
  if (props.task.status === 'pending') {
    pollTimer = setInterval(loadMessages, 2500);
  }
}, { immediate: true });

watch(() => props.task?.status, (s) => {
  if (s !== 'pending') stopPoll();
});

onBeforeUnmount(stopPoll);

// ─── 渲染分流 ───────────────────────────────
const renderRows = computed(() =>
  messages.value.map((m) => {
    if (m.role === 'tool') {
      return { kind: 'tool_result', id: m.id, ts: m.ts, callId: m.tool_call_id, content: m.content };
    }
    if (m.role === 'assistant') {
      const calls = Array.isArray(m.tool_calls) ? m.tool_calls : [];
      return {
        kind: calls.length ? 'assistant_call' : 'assistant',
        id: m.id, ts: m.ts,
        text: m.content || '',
        calls
      };
    }
    if (m.role === 'system') return { kind: 'system', id: m.id, ts: m.ts, text: m.content };
    if (m.role === 'user')   return { kind: 'user',   id: m.id, ts: m.ts, text: m.content };
    return { kind: 'raw', id: m.id, ts: m.ts, text: typeof m.content === 'string' ? m.content : JSON.stringify(m, null, 2) };
  })
);

const fmtArgs = (s) => {
  if (!s) return '';
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return String(s); }
};
const fmtContent = (c) => {
  if (c == null) return '';
  if (typeof c === 'string') return c;
  return JSON.stringify(c, null, 2);
};
</script>

<template>
  <div class="flex h-full max-w-[960px] mx-auto flex-col py-4">

    <!-- 状态条 -->
    <div class="flex flex-wrap items-center gap-2 px-1 pb-4 border-b border-line-soft text-[11.5px] text-faint">
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-[10px] text-[11px] font-medium"
        :class="BADGE_CLS[status.cls] || BADGE_CLS.pending">
        <span v-if="task.status === 'pending'" class="msi xxs animate-spin">autorenew</span>
        <span v-else class="msi xxs">{{ status.icon }}</span>
        {{ status.label }}
      </span>
      <span class="px-1.5 py-px rounded font-mono text-[10.5px] text-muted bg-bg-elev">{{ task.app }}</span>
      <span>{{ relTime(task.created_at) }}</span>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto pt-5 pb-4 flex flex-col gap-3.5">

      <!-- Prompt -->
      <section v-if="task.prompt" class="rounded-xl px-4.5 py-3.5 bg-[#fafbfc]">
        <div class="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">Prompt</div>
        <pre class="m-0 font-mono text-[12.5px] leading-[1.6] text-ink whitespace-pre-wrap break-words">{{ task.prompt }}</pre>
      </section>

      <!-- 执行过程 (assistant / tool_call / tool_result), 默认折叠 -->
      <section v-if="renderRows.length" class="rounded-xl px-4.5 py-3.5 bg-[#fafbfc]">
        <button type="button"
          class="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2 rounded-md px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-faint cursor-pointer hover:bg-bg-hi"
          :class="{ 'mb-3': showProcess }"
          @click="showProcess = !showProcess">
          <span class="msi xxs transition-transform" :class="{ '-rotate-90': !showProcess }">expand_more</span>
          <span>执行过程</span>
          <span class="font-mono text-[10.5px] text-muted normal-case tracking-normal">{{ renderRows.length }} 条</span>
          <span v-if="task.status === 'pending'" class="msi xxs animate-spin text-blue-fg">autorenew</span>
        </button>

        <div v-if="showProcess" class="flex flex-col gap-3">
          <template v-for="r in renderRows" :key="r.id">

            <!-- 助手文字 -->
            <div v-if="r.kind === 'assistant' && r.text"
              class="rounded-lg bg-white px-3.5 py-2.5 border border-line-soft">
              <div class="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-blue-fg">assistant</div>
              <pre class="m-0 font-sans text-[13px] leading-[1.6] text-ink whitespace-pre-wrap break-words">{{ r.text }}</pre>
            </div>

            <!-- 助手调用工具 -->
            <div v-else-if="r.kind === 'assistant_call'" class="flex flex-col gap-2">
              <div v-if="r.text"
                class="rounded-lg bg-white px-3.5 py-2.5 border border-line-soft">
                <div class="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-blue-fg">assistant</div>
                <pre class="m-0 font-sans text-[13px] leading-[1.6] text-ink whitespace-pre-wrap break-words">{{ r.text }}</pre>
              </div>
              <div v-for="c in r.calls" :key="c.id"
                class="rounded-lg bg-[#fff8e6] border border-[#fde2a7] px-3.5 py-2.5">
                <div class="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#b06000]">
                  <span class="msi xxs">build</span>
                  <span>tool_call</span>
                  <span class="font-mono normal-case tracking-normal text-ink">{{ c.function?.name }}</span>
                </div>
                <pre class="m-0 font-mono text-[12px] leading-[1.55] text-ink whitespace-pre-wrap break-words">{{ fmtArgs(c.function?.arguments) }}</pre>
              </div>
            </div>

            <!-- 工具结果 -->
            <div v-else-if="r.kind === 'tool_result'"
              class="rounded-lg bg-[#f0f7f4] border border-[#cfe5d8] px-3.5 py-2.5">
              <div class="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-good">
                <span class="msi xxs">check</span>
                <span>tool_result</span>
              </div>
              <pre class="m-0 font-mono text-[12px] leading-[1.55] text-ink whitespace-pre-wrap break-words">{{ fmtContent(r.content) }}</pre>
            </div>

            <!-- 系统 / 用户 / 其它 -->
            <div v-else-if="r.text"
              class="rounded-lg bg-bg-elev px-3.5 py-2.5">
              <div class="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint">{{ r.kind }}</div>
              <pre class="m-0 font-mono text-[12px] leading-[1.55] text-ink whitespace-pre-wrap break-words">{{ r.text }}</pre>
            </div>

          </template>
        </div>
      </section>

      <!-- 最终响应 (没消息流时回退展示) -->
      <section v-if="task.response && !renderRows.length" class="rounded-xl px-4.5 py-3.5 bg-[#fafbfc]">
        <div class="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">Response</div>
        <pre class="m-0 font-mono text-[12.5px] leading-[1.6] text-ink whitespace-pre-wrap break-words">{{ typeof task.response === 'string' ? task.response : JSON.stringify(task.response, null, 2) }}</pre>
      </section>

      <!-- 错误 -->
      <section v-if="task.error" class="rounded-xl px-4.5 py-3.5 bg-[#fff3f2]">
        <div class="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-bad">Error</div>
        <pre class="m-0 font-mono text-[12.5px] leading-[1.6] text-ink whitespace-pre-wrap break-words">{{ task.error }}</pre>
      </section>

      <!-- 真没东西可看 -->
      <section v-if="!task.response && !task.error && !renderRows.length"
        class="rounded-xl px-4.5 py-3.5 bg-bg-elev flex items-center gap-2 text-[12.5px] text-faint">
        <span v-if="task.status === 'pending'" class="msi xxs animate-spin">autorenew</span>
        <span>{{ task.status === 'pending' ? '执行中, 暂无消息…' : '(无输出)' }}</span>
      </section>
    </div>
  </div>
</template>
