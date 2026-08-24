<template>
  <div class="relative z-10 w-[600px] max-w-[96vw] rounded-2xl border border-[#4a3a28] bg-gradient-to-t from-[#1a1410] to-[#251d18] p-3 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
    <div v-if="lastActionText && game?.status !== 'done'" class="mb-3 text-center text-[11px] tracking-wide text-[#9bc49b] sm:text-[12px]">{{ lastActionText }}</div>
    <div v-if="!game || game.status === 'done'" class="mt-1 flex flex-col items-center">
      <div class="mb-3 px-2 text-center text-[11px] leading-relaxed text-[#8a7a58]/80 sm:text-xs">
        <p>玩法 <span class="font-bold text-[#c8a060]">跟注</span>、<span class="font-bold text-[#a07a4a]">加注</span> 或 <span class="font-bold text-[#8a5a4a]">弃牌</span>。</p>
        <p class="mt-0.5">每局最多 {n} 轮下注 <span class="font-bold text-[#c8a060]">封顶第 {n} 轮自动比牌</span>提前弃牌或比牌即可结束本局</p>
      </div>
      <button @click="$emit('start')" :disabled="busy" class="w-full rounded-xl bg-[#c8a060] px-8 py-2.5 text-[14px] font-bold tracking-wider text-[#1a1008] shadow-[0_4px_15px_rgba(200,160,96,0.3)] transition-all hover:-translate-y-1 hover:bg-[#d4b070] disabled:opacity-40 sm:w-auto">
        {{ game ? '再来一局' : '开始新一局' }}
      </button>
    </div>
    <div v-else class="flex justify-center gap-2 sm:gap-3">
      <button @click="$emit('action', 'call')" :disabled="busy" class="flex-1 rounded-xl bg-[#c8a060] py-2 text-[12px] font-bold tracking-wider text-[#1a1008] shadow-[0_4px_15px_rgba(200,160,96,0.3)] transition-all hover:-translate-y-1 hover:bg-[#d4b070] disabled:opacity-40 disabled:hover:translate-y-0 sm:py-2.5 sm:text-[13px]">跟注</button>
      <button @click="$emit('action', 'raise')" :disabled="busy" class="flex-1 rounded-xl bg-[#c89050] py-2 text-[12px] font-bold tracking-wider text-[#1a1008] shadow-[0_4px_15px_rgba(200,144,80,0.35)] transition-all hover:-translate-y-1 hover:bg-[#d7a060] disabled:opacity-40 disabled:hover:translate-y-0 sm:py-2.5 sm:text-[13px]">加注</button>
      <button @click="$emit('action', 'fold')" :disabled="busy" class="flex-1 rounded-xl border border-[#8a5a4a] bg-transparent py-2 text-[12px] font-bold tracking-wider text-[#8a5a4a] transition-all hover:-translate-y-1 hover:bg-[#8a5a4a] hover:text-white disabled:opacity-40 disabled:hover:translate-y-0 sm:py-2.5 sm:text-[13px]">弃牌</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  lastActionText: { type: String, required: true },
  game: { type: Object, default: null },
  busy: { type: Boolean, required: true }
});

defineEmits(['start', 'action']);

</script>
