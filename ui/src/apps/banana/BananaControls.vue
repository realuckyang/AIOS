<template>
  <div>
    <div v-if="timeLine.length > 0" class="flex flex-1 flex-col gap-2.5 overflow-y-auto py-[10px] pb-2">
      <button
        v-for="(option, i) in timeLine[currentIndex].options"
        :key="i"
        class="w-full rounded-md border border-[#9c9288] bg-[linear-gradient(180deg,#e6e0d8_0%,#c2b8ac_100%)] px-2.5 py-2 text-left text-[11px] font-extrabold text-[#4a4136] [text-shadow:0_1px_0_rgba(255,255,255,0.5)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_3px_0_#8a8076,0_4px_6px_rgba(0,0,0,0.18)] transition-all active:translate-y-[3px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_0_0,0_1px_2px_rgba(0,0,0,0.15)] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0"
        :disabled="isChoosing"
        @click="$emit('choose', option)"
      >{{ option.text }}</button>
    </div>

    <input
      :value="customOption"
      class="mt-2 box-border w-full rounded-md border border-[#d4c8b4] bg-[#faf7f2] px-2.5 py-2 text-[11px] font-bold text-[#3e3223] shadow-[inset_0_3px_6px_rgba(0,0,0,0.12),0_2px_0_rgba(255,255,255,0.8)] outline-none placeholder:text-[#b8ad9e] focus:border-[#8a7f62]"
      placeholder="或者自己说一句…"
      @input="$emit('update:customOption', $event.target.value)"
      @keydown.enter.prevent="customOption.trim() && $emit('choose', { text: customOption })"
    />

    <button
      class="mt-2 w-full rounded-lg border-2 border-[#7a2810] bg-[linear-gradient(180deg,#d05a38_0%,#a83c20_100%)] py-2.5 text-[13px] font-black tracking-[2px] text-[#fdf0e8] [text-shadow:0_1px_2px_rgba(0,0,0,0.4)] shadow-[inset_0_2px_0_rgba(255,255,255,0.2),0_4px_0_#6a1e08,0_5px_8px_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_0_#6a1e08,0_1px_2px_rgba(0,0,0,0.3)] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0"
      :disabled="!customOption.trim() || isChoosing"
      @click="$emit('choose', { text: customOption })"
    >发送</button>
  </div>
</template>

<script setup>
defineProps({
  timeLine: { type: Array, required: true },
  currentIndex: { type: Number, required: true },
  customOption: { type: String, required: true },
  isChoosing: { type: Boolean, required: true }
});

defineEmits(['choose', 'update:customOption']);
</script>
