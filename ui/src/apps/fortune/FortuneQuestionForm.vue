<template>
  <div class="mb-5 rounded-[10px] border border-black/[.06] bg-white/40 p-3.5">
    <textarea
      :value="question"
      rows="2"
      placeholder="把困惑写在这里…"
      :disabled="shaking || loading"
      class="w-full resize-none border-none bg-transparent text-sm leading-[1.6] text-[#3a2e20] outline-none placeholder:text-[#b0a080] disabled:opacity-50"
      @input="$emit('update:question', $event.target.value)"
    ></textarea>
    <button
      class="mt-2.5 w-full rounded-lg bg-[linear-gradient(135deg,#c8a060,#a07830)] px-3 py-[11px] font-serif text-sm font-bold tracking-[0.15em] text-[#fff8ee] shadow-[0_2px_8px_rgba(0,0,0,.12)] transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-45"
      @click="$emit('divine')"
      :disabled="shaking || loading || !question.trim()"
    >
      {{ shaking ? '摇卦中…' : loading ? '卦师正在解卦…' : '起卦' }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  question: { type: String, required: true },
  shaking: { type: Boolean, required: true },
  loading: { type: Boolean, required: true }
});

defineEmits(['update:question', 'divine']);

</script>
