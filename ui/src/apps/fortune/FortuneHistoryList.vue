<template>
  <div v-if="history.length" class="mt-1">
    <div class="mb-2.5 text-[11px] font-bold tracking-[0.15em] text-[#a09070]">历史卦象</div>
    <div
      v-for="item in history"
      :key="item.id"
      class="mb-1.5 rounded-lg border border-black/[.04] bg-white/40 px-3.5 py-3"
    >
      <div class="flex items-center gap-2">
        <span class="font-serif text-xs font-bold text-[#5a4020]">{{ item.hexagram || '' }}</span>
        <span class="text-xs text-[#8a6a30]">{{ item.signName }}</span>
        <span class="ml-auto text-[10px] text-[#b0a088]">{{ formatTime(item.createdAt) }}</span>
      </div>
      <div class="mt-1 text-xs text-[#7a6a48]">{{ item.question }}</div>
      <div class="mt-0.5 text-[11px] italic text-[#a09070]">"{{ item.signPoem }}"</div>
    </div>
  </div>
  <div v-else-if="!result" class="py-8 text-center text-[13px] text-[#b0a080]">暂无历史卦象</div>
</template>

<script setup>
defineProps({
  history: { type: Array, required: true },
  result: { type: Object, default: null },
  formatTime: { type: Function, required: true }
});

</script>
