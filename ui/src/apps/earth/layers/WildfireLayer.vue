<script setup>
import { onMounted, ref, watch } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  selected: { type: Object, default: null }
});
const emit = defineEmits(['select', 'count']);

const items = ref([]);
async function load() {
  try {
    const r = await fetch('/apps/earth/wildfire?days=30').then((x) => x.json());
    items.value = r.items || [];
    emit('count', items.value.length);
  } catch {}
}
onMounted(() => { if (props.visible) load(); });
watch(() => props.visible, (v) => { if (v && !items.value.length) load(); });

defineExpose({ reload: load, items, layerKey: 'wildfire' });
</script>

<template>
  <g v-if="visible">
    <circle v-for="w in items" :key="w.id"
      :cx="w.lng" :cy="-w.lat"
      r="0.8"
      fill="#fb923c"
      :fill-opacity="selected?.layer === 'wildfire' && selected?.feature?.id === w.id ? 0.95 : 0.65"
      :stroke="selected?.layer === 'wildfire' && selected?.feature?.id === w.id ? '#fff' : '#dc2626'"
      stroke-width="0.15"
      class="cursor-pointer transition-all duration-150"
      @click.stop="emit('select', { layer: 'wildfire', feature: w })">
      <animate attributeName="r" values="0.8;1.1;0.8" dur="2.4s" repeatCount="indefinite" />
    </circle>
  </g>
</template>
