<script setup>
defineProps({
  content: { type: String, default: '' }
});
</script>

<template>
  <div class="flex max-w-[720px] items-start gap-2.5 font-mono">
    <span class="mt-2 h-2 w-2 flex-none rounded-full bg-accent/40"></span>
    <pre class="m-0 min-w-0 flex-1 overflow-x-auto whitespace-pre text-[12px] leading-[1.55] text-faint [scrollbar-width:none]">{{ content }}</pre>
  </div>
</template>
