<template>
  <div v-if="result" class="scroll-card mb-5 rounded border-2 border-[#c8a868] px-5 py-6 shadow-[0_4px_16px_rgba(0,0,0,.08)]">
    <div class="text-center font-serif text-[28px] font-black tracking-[0.1em] text-[#8a5c28]">{{ result.signName }}</div>
    <div class="mt-2.5 text-center text-[13px] italic leading-8 text-[#8a7a58]" v-html="formatPoem(result.signPoem)"></div>
    <div class="mx-auto my-4 h-px w-[60px] bg-[#c8a868]"></div>
    <div class="flex justify-center gap-12">
      <div class="text-center">
        <div class="font-serif text-[13px] font-extrabold tracking-[0.1em] text-[#6a9a50]">宜</div>
        <div class="mt-1 text-xs text-[#5a4a30]">{{ result.good }}</div>
      </div>
      <div class="text-center">
        <div class="font-serif text-[13px] font-extrabold tracking-[0.1em] text-[#b05040]">忌</div>
        <div class="mt-1 text-xs text-[#5a4a30]">{{ result.bad }}</div>
      </div>
    </div>
    <div class="mt-4 px-2 text-center text-[13px] leading-8 text-[#7a6a48]">{{ result.advice }}</div>
  </div>
</template>

<script setup>
defineProps({
  result: { type: Object, default: null },
  formatPoem: { type: Function, required: true }
});

</script>

<style scoped>
.scroll-card {
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

.scroll-card::before,
.scroll-card::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 10px;
  pointer-events: none;
}

.scroll-card::before {
  top: 0;
  background: linear-gradient(180deg, rgba(200, 168, 96, .25), transparent);
  border-radius: 4px 4px 0 0;
}

.scroll-card::after {
  bottom: 0;
  background: linear-gradient(0deg, rgba(200, 168, 96, .25), transparent);
  border-radius: 0 0 4px 4px;
}
</style>
