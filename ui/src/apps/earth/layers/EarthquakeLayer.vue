<script setup>
import { onMounted, ref, watch } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  selected: { type: Object, default: null }
});
const emit = defineEmits(['select', 'count']);

const items = ref([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    const r = await fetch('/apps/earth/earthquake?minMagnitude=2.5&days=7').then((x) => x.json());
    items.value = r.items || [];
    emit('count', items.value.length);
  } catch {} finally { loading.value = false; }
}

const magRadius = (m) => 0.6 + Math.max(0, m - 2) * 0.7;
const magColor = (m) => {
  if (m >= 6) return '#e94560';
  if (m >= 5) return '#f39c12';
  if (m >= 4) return '#f1c40f';
  if (m >= 3) return '#7dd3fc';
  return '#94a3b8';
};

onMounted(() => { if (props.visible) load(); });
watch(() => props.visible, (v) => { if (v && !items.value.length) load(); });

defineExpose({ reload: load, items, layerKey: 'earthquake' });
</script>

<template>
  <g v-if="visible">
    <circle v-for="q in items" :key="q.id"
      :cx="q.lng" :cy="-q.lat"
      :r="magRadius(q.mag)"
      :fill="magColor(q.mag)"
      :fill-opacity="selected?.layer === 'earthquake' && selected?.feature?.id === q.id ? 0.95 : 0.55"
      :stroke="selected?.layer === 'earthquake' && selected?.feature?.id === q.id ? '#fff' : 'none'"
      stroke-width="0.3"
      class="cursor-pointer transition-all duration-150"
      @click.stop="emit('select', { layer: 'earthquake', feature: q })" />
  </g>
</template>
