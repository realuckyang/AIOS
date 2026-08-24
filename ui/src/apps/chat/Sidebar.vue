<script setup>
defineProps({
  conversations: { type: Array, default: () => [] },
  activeId: { type: String, default: null }
});

const emit = defineEmits(['pick', 'new-chat']);

function relTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toTimeString().slice(0, 5);
  const diff = (now - d) / (24 * 3600 * 1000);
  if (diff < 7) return `${Math.floor(diff)} 天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
</script>

<template>
  <div class="app-side-inner">
    <!-- 顶部「新对话」按钮 -->
    <div class="flex flex-none items-center gap-2 pl-3 pr-3 pt-3.5 pb-2">
      <button
        class="inline-flex items-center gap-2 rounded-[22px] border border-line bg-white py-2.5 pl-4 pr-[18px] text-[13.5px] font-medium text-ink shadow-1 transition-[background,box-shadow] hover:bg-[#fafbfc] hover:shadow-2"
        @click="emit('new-chat')">
        <span class="msi sm text-accent">edit_square</span>
        <span>新对话</span>
      </button>
    </div>

    <!-- 历史列表 -->
    <div class="flex-1 min-h-0 overflow-y-auto px-2 pt-1 pb-2">
      <div v-if="!conversations.length"
        class="px-4 py-5 text-center text-[12.5px] text-faint">
        还没有对话,点上方 ✎ 新建一个
      </div>
      <div v-for="c in conversations" :key="c.conversation_id"
        class="my-px cursor-pointer rounded-[22px] px-3.5 py-2.5 transition-colors hover:bg-black/5"
        :class="c.conversation_id === activeId ? 'is-active bg-blue-bg' : ''"
        @click="emit('pick', c.conversation_id)">
        <div class="flex items-center gap-1.5">
          <span v-if="c.pinned" class="msi xxs flex-none text-accent">push_pin</span>
          <span class="flex-1 min-w-0 truncate text-[13.5px] font-medium text-ink">
            {{ c.title || '未命名' }}
          </span>
        </div>
        <div class="conv-time mt-0.5 text-[11.5px] tabular-nums text-faint">
          {{ relTime(c.created_at) }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.is-active :deep(.conv-time) { color: var(--accent-fg); opacity: 0.7; }
</style>
