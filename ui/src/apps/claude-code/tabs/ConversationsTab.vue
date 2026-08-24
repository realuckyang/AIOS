<script setup>
import { onMounted, ref } from 'vue';
import { Trash2 } from 'lucide-vue-next';
import { formatShortTime } from '../utils.js';

const emit = defineEmits(['open']);

const items = ref([]);
const loading = ref(false);
const homedirPrefix = ref('');

async function fetchList() {
  loading.value = true;
  try {
    const r = await fetch('/apps/claude-code/conversations');
    const data = await r.json();
    items.value = data.items || [];
    homedirPrefix.value = data.homedir || '';
  } finally { loading.value = false; }
}

async function removeConversation(sid) {
  if (!confirm('删除这个对话?')) return;
  await fetch('/apps/claude-code/conversations/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId: sid })
  });
  await fetchList();
}

onMounted(fetchList);
</script>

<template>
  <div class="conv-tab">
    <header class="head">
      <div>
        <div class="title">对话历史</div>
        <div class="sub">所有 Claude Code 会话 · {{ items.length }} 项</div>
      </div>
    </header>

    <div v-if="loading && !items.length" class="empty">加载中…</div>
    <div v-else-if="!items.length" class="empty">暂无会话,去「对话」开一个</div>
    <ul v-else class="list">
      <li v-for="c in items" :key="c.sessionId" class="row" @click="emit('open', c.sessionId)">
        <div class="meta">
          <div class="t">{{ c.title?.trim() || ('会话 ' + c.sessionId.slice(0, 8)) }}</div>
          <div class="cwd">{{ c.cwd?.replace(homedirPrefix, '~') || '' }}</div>
          <div class="row-foot">
            <span class="num">{{ c.messageCount || 0 }} 条</span>
            <span class="time">{{ formatShortTime(c.updatedAt) }}</span>
          </div>
        </div>
        <button class="x" type="button" title="删除" @click.stop="removeConversation(c.sessionId)">
          <Trash2 :size="15" :stroke-width="1.7" />
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.conv-tab {
  flex: 1; min-height: 0; min-width: 0;
  display: flex; flex-direction: column;
  padding: 24px 32px 32px;
  overflow: auto;
  gap: 16px;
}
.head .title { font-size: 18px; font-weight: 600; color: var(--text); letter-spacing: -0.01em; }
.head .sub { margin-top: 2px; font-size: 12.5px; color: var(--text-3); }

.empty { padding: 60px 20px; text-align: center; color: var(--text-3); font-size: 13px; }

.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.row {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  cursor: pointer;
  transition: background .12s, border-color .12s, transform .12s, box-shadow .12s;
}
.row:hover { background: var(--bg); border-color: var(--line-hi); transform: translateY(-1px); box-shadow: var(--shadow-1); }
.meta { flex: 1; min-width: 0; }
.t { font-size: 14.5px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cwd {
  margin-top: 3px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-3);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.row-foot { margin-top: 4px; display: flex; align-items: center; gap: 10px; font-size: 11px; color: var(--text-3); }
.num { font-family: var(--font-mono); }

.x {
  flex: none;
  width: 36px; height: 36px;
  display: grid; place-items: center;
  border: 0; background: transparent;
  border-radius: 50%;
  color: var(--text-3);
  cursor: pointer;
  opacity: 0;
  transition: opacity .12s, background .12s, color .12s;
}
.row:hover .x { opacity: 1; }
.x:hover { background: color-mix(in srgb, var(--bad) 10%, transparent); color: var(--bad); }
</style>
