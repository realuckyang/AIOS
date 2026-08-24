<template>
  <div class="flex h-full min-h-0 flex-col items-center overflow-y-auto py-4 font-['Georgia','PingFang_SC',serif] sm:py-6">

    <div v-if="aiSpeech || aiExpression" class="relative z-10 -mb-4 w-[500px] max-w-[90vw] rounded-2xl border border-[#c8a060]/30 bg-gradient-to-b from-[#2a1e10]/90 to-[#150f08]/90 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md sm:p-4">
      <div class="flex items-start gap-3 sm:gap-4">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#c8a060] text-lg font-bold text-[#1a1008] shadow-[0_0_15px_rgba(200,160,96,0.3)]">AI</div>
        <div class="text-[14px] leading-relaxed tracking-wide text-[#e8d4b8]">
          {{ aiSpeech }} <span v-if="aiExpression" class="text-sm">{{ aiExpression }}</span>
        </div>
      </div>
    </div>

    <div class="relative flex w-[700px] max-w-[96vw] flex-col items-center justify-between rounded-[40px] border-[4px] border-[#3a2010] bg-[radial-gradient(ellipse_at_50%_50%,#2a6a30_0%,#153a1a_100%)] p-4 pt-6 shadow-[inset_0_0_80px_rgba(0,0,0,0.6),0_20px_50px_rgba(0,0,0,0.5)] sm:rounded-[60px] sm:border-[6px] sm:p-6 sm:pt-8">
      <div class="relative flex w-full flex-col items-center gap-2">
        <div class="flex flex-col items-center gap-0.5 rounded-xl bg-black/30 px-4 py-1">
          <span class="text-[10px] uppercase tracking-widest text-[#80b080]">AI 筹码</span>
          <span class="font-mono text-base font-bold text-[#d4b878] sm:text-lg">{{ game ? game.aiChips : economy.aiBalance }}</span>
        </div>
        <div class="flex gap-2">
          <div
            v-for="(card, i) in displayAiCards"
            :key="'ai' + i"
            class="flex h-[80px] w-[55px] items-center justify-center rounded-lg border-2 shadow-lg transition-transform hover:-translate-y-2 sm:h-[90px] sm:w-[60px]"
            :class="card ? 'border-[#ddd0b0] bg-[#fffdf8] ' + (i === 0 ? '-rotate-6' : (i === 2 ? 'rotate-6' : '')) : 'border-[#5a3a20] bg-[repeating-linear-gradient(45deg,#8a2020,#8a2020_4px,#a03030_4px,#a03030_8px)] ' + (i === 0 ? '-rotate-6' : (i === 2 ? 'rotate-6' : ''))"
          >
            <template v-if="card">
              <div class="text-center">
                <div class="text-xl font-bold sm:text-2xl" :class="card.suit === 'heart' || card.suit === 'diamond' ? 'text-[#cc3333]' : 'text-[#2a2a2a]'">{{ rankLabel(card.rank) }}</div>
                <div class="text-base sm:text-lg" :class="card.suit === 'heart' || card.suit === 'diamond' ? 'text-[#cc3333]' : 'text-[#2a2a2a]'">{{ suitIcon(card.suit) }}</div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <div class="relative my-3 flex shrink-0 flex-col items-center sm:my-5">
        <div class="absolute left-1/2 top-1/2 h-[160px] w-[160px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5 sm:h-[220px] sm:w-[220px]"></div>
        <div class="absolute left-1/2 top-1/2 h-[120px] w-[120px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 sm:h-[160px] sm:w-[160px]"></div>
        <span class="z-10 mb-1 text-[10px] uppercase tracking-widest text-[#a0d0a0]">底池</span>
        <div class="z-10 flex items-center gap-2 rounded-full border border-[#c8a060]/40 bg-[#c8a060]/10 px-5 py-1.5 shadow-[0_0_20px_rgba(200,160,96,0.15)] backdrop-blur sm:px-6 sm:py-2">
          <span class="font-mono text-xl font-bold text-[#ffd700] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] sm:text-2xl">{{ game?.pot ?? 0 }}</span>
        </div>
        <span class="z-10 mt-1 text-[10px] font-bold tracking-widest text-[#6a8a6a] sm:mt-2 sm:text-xs">{{ roundStatusText }}</span>
      </div>

      <div class="relative flex w-full flex-col items-center gap-2">
        <div class="group flex gap-[-10px]">
          <template v-if="game?.playerCards?.length">
            <div
              v-for="(card, i) in game.playerCards"
              :key="'p' + i"
              class="flex h-[90px] w-[62px] flex-col items-center justify-center rounded-xl border border-[#e8d4b8] bg-white text-center shadow-[0_10px_20px_rgba(0,0,0,0.4)] transition-transform group-hover:-translate-y-3 sm:h-[100px] sm:w-[68px]"
              :class="i === 0 ? '-rotate-6 translate-x-[10px] z-10' : (i === 1 ? 'z-20' : 'rotate-6 -translate-x-[10px] z-30')"
            >
              <div class="text-lg font-bold sm:text-xl" :class="card.suit === 'heart' || card.suit === 'diamond' ? 'text-[#cc3333]' : 'text-[#2a2a2a]'">{{ rankLabel(card.rank) }}</div>
              <div class="text-base sm:text-lg" :class="card.suit === 'heart' || card.suit === 'diamond' ? 'text-[#cc3333]' : 'text-[#2a2a2a]'">{{ suitIcon(card.suit) }}</div>
            </div>
          </template>
        </div>
        <div class="mt-1 flex flex-col items-center gap-0.5 rounded-xl bg-black/30 px-4 py-1">
          <span class="text-[10px] uppercase tracking-widest text-[#80b080]">你的筹码</span>
          <span class="font-mono text-base font-bold text-[#d4b878] sm:text-lg">{{ game ? game.playerChips : economy.playerBalance }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  aiSpeech: { type: String, required: true },
  aiExpression: { type: String, required: true },
  game: { type: Object, default: null },
  economy: { type: Object, required: true },
  displayAiCards: { type: Array, required: true },
  roundStatusText: { type: String, required: true },
  suitIcon: { type: Function, required: true },
  rankLabel: { type: Function, required: true }
});

</script>
