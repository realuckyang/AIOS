<template>
  <div class="hex-area mb-5 rounded border-2 border-[#c8a868] px-5 py-6 shadow-[0_4px_16px_rgba(0,0,0,.08)]">
    <div v-if="hexagramName" class="mb-1 text-center font-serif text-xl font-black tracking-[0.15em] text-[#5a4020]">{{ hexagramName }}</div>
    <div v-if="result && result.signName" class="mb-3.5 text-center text-[13px] tracking-[0.1em] text-[#8a6a30]">{{ result.signName }}</div>

    <div v-if="displayYaos.some(y => y !== null)" class="flex flex-col items-center gap-2 py-2">
      <div
        v-for="(yao, i) in displayYaos"
        :key="i"
        class="flex items-center gap-2.5 transition-all duration-300"
        :style="{ opacity: yao !== null ? 1 : 0, transform: yao !== null ? 'none' : 'translateY(6px)' }"
      >
        <span class="w-4 text-right font-serif text-[11px] text-[#a09070]">{{ yaoLabels[i] }}</span>
        <div v-if="yao === 1">
          <div class="h-2.5 w-[100px] rounded-[2px] bg-[linear-gradient(180deg,#8a5c28,#6a4420)] shadow-[0_1px_3px_rgba(0,0,0,.15)]"></div>
        </div>
        <div v-else-if="yao === 0" class="flex gap-3.5">
          <div class="h-2.5 w-[43px] rounded-[2px] bg-[linear-gradient(180deg,#8a5c28,#6a4420)] shadow-[0_1px_3px_rgba(0,0,0,.15)]"></div>
          <div class="h-2.5 w-[43px] rounded-[2px] bg-[linear-gradient(180deg,#8a5c28,#6a4420)] shadow-[0_1px_3px_rgba(0,0,0,.15)]"></div>
        </div>
        <div v-else class="h-2.5 w-[100px]"></div>
        <span class="flex gap-[3px]">
          <span
            v-for="(c, j) in (coins[i] || [])"
            :key="j"
            class="inline-flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-[#b09050] text-[8px] font-bold"
            :class="c ? 'bg-[#d4b870] text-[#5a4020]' : 'bg-[#f0e4d0] text-[#8a7a58]'"
          >
            {{ c ? '字' : '幕' }}
          </span>
        </span>
      </div>
    </div>

    <div v-if="!shaking && !hexagramName && !result" class="py-7 text-center text-[13px] text-[#b0a080]">
      <div class="mb-2 text-4xl opacity-35">☰</div>
      <div>心诚则灵,先把问题写下来再起卦。</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  hexagramName: { type: String, required: true },
  result: { type: Object, default: null },
  displayYaos: { type: Array, required: true },
  yaoLabels: { type: Array, required: true },
  coins: { type: Array, required: true },
  shaking: { type: Boolean, required: true }
});

</script>

<style scoped>
.hex-area {
  background:
    repeating-linear-gradient(90deg,
      rgba(160, 120, 60, .06) 0px, rgba(160, 120, 60, .06) 1px,
      transparent 1px, transparent 28px),
    linear-gradient(180deg, #f0e4d0, #e8dcc4);
  border: 2px solid #c8a868;
  border-radius: 4px;
  padding: 24px 20px;
  margin-bottom: 20px;
  position: relative;
  box-shadow: 0 4px 16px rgba(0, 0, 0, .08);
}

.hex-area::before,
.hex-area::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 10px;
  pointer-events: none;
}

.hex-area::before {
  top: 0;
  background: linear-gradient(180deg, rgba(200, 168, 96, .25), transparent);
  border-radius: 4px 4px 0 0;
}

.hex-area::after {
  bottom: 0;
  background: linear-gradient(0deg, rgba(200, 168, 96, .25), transparent);
  border-radius: 0 0 4px 4px;
}
</style>
