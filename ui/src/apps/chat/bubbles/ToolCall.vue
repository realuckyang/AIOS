<script setup>
// 工具调用气泡 — 直接接受 msg 对象, expanded 字段挂在 msg 上 (跨组件保留状态)
defineProps({
  msg: { type: Object, required: true }
});
</script>

<template>
  <div class="max-w-[720px] overflow-hidden rounded-xl border border-line bg-white">
    <button type="button"
      class="flex w-full items-center gap-1.5 border-0 bg-accent/5 px-3 py-2.5 text-left transition-colors hover:bg-accent/10"
      @click="msg.expanded = !msg.expanded">
      <span
        class="msi xs flex-none text-faint transition-transform"
        :class="msg.expanded ? 'rotate-90' : ''">chevron_right</span>
      <span class="flex-1 truncate text-[12px] text-ink">{{ msg.title }}</span>
      <span v-if="msg.result" class="text-[11px] text-faint">完成</span>
    </button>
    <div v-if="msg.expanded" class="border-t border-line/60">
      <pre v-if="msg.shell && msg.command"
        class="m-0 overflow-x-auto whitespace-pre bg-[#f6f8fc] px-3 py-2.5 text-[12px] leading-[1.55] text-good [scrollbar-width:none]"><span class="select-none text-faint">$ </span>{{ msg.command }}</pre>
      <pre v-else-if="msg.detail"
        class="m-0 overflow-x-auto whitespace-pre bg-bg-elev px-3 py-2.5 text-[12px] leading-[1.55] text-muted [scrollbar-width:none]">{{ msg.detail }}</pre>
      <pre v-if="msg.result"
        class="m-0 max-h-[200px] overflow-x-auto overflow-y-auto whitespace-pre border-t border-line/60 bg-accent/3 px-3 py-2.5 text-[12px] leading-[1.55] text-muted [scrollbar-width:none]">{{ msg.result }}</pre>
    </div>
  </div>
</template>
