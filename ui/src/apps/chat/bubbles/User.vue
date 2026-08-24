<script setup>
defineProps({
  text: { type: String, default: '' },
  attachments: { type: Array, default: () => [] }
});
</script>

<template>
  <div
    class="chat-scroll-bubble ml-auto rounded-2xl rounded-tr-[4px] bg-accent px-3.5 py-2.5 text-[14px] leading-[1.55] text-white"
    style="max-width: min(70%, 560px)">
    <div v-if="text" class="whitespace-pre">{{ text }}</div>
    <div v-if="attachments?.length" class="mt-1.5 flex flex-wrap gap-1">
      <span v-for="(f, idx) in attachments" :key="idx"
        class="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px]">
        <span class="msi xxs">attach_file</span>
        <span class="max-w-[180px] truncate">{{ f.name }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.chat-scroll-bubble {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}
.chat-scroll-bubble::-webkit-scrollbar { display: none; }
</style>
