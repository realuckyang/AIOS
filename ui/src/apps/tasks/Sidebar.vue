<script setup>
defineProps({
  filters: { type: Array, required: true },
  current: { type: String, required: true },
  counts:  { type: Object, default: () => ({}) }
});
defineEmits(['pick']);
</script>

<template>
  <nav class="flex flex-col gap-0.5 py-2">
    <button v-for="f in filters" :key="f.id"
      class="flex items-center gap-3.5 h-10 pl-6 pr-3.5 mr-3 rounded-r-[20px] text-[14px] font-medium text-ink cursor-pointer transition-colors hover:bg-bg-hi"
      :class="{ '!bg-blue-bg !text-blue-fg': f.id === current }"
      @click="$emit('pick', f.id)">
      <span class="msi sm" :class="f.id === current ? 'text-blue-fg' : 'text-muted'">{{ f.icon }}</span>
      <span class="flex-1 min-w-0 truncate text-left">{{ f.name }}</span>
      <span v-if="counts[f.id]"
        class="px-2 py-px rounded-[10px] text-[11.5px] tabular-nums"
        :class="f.id === current ? 'bg-white/50 text-blue-fg' : 'bg-bg-elev text-faint'">
        {{ counts[f.id] }}
      </span>
    </button>
  </nav>
</template>
