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
    const r = await fetch('/apps/earth/volcano?days=90').then((x) => x.json());
    items.value = r.items || [];
    emit('count', items.value.length);
  } catch {}
}
onMounted(() => { if (props.visible) load(); });
watch(() => props.visible, (v) => { if (v && !items.value.length) load(); });

const triPath = (lng, lat, size = 1.4) =>
  `M${lng},${-lat - size}L${lng + size * 0.86},${-lat + size * 0.5}L${lng - size * 0.86},${-lat + size * 0.5}Z`;

defineExpose({ reload: load, items, layerKey: 'volcano' });
</script>

<template>
  <g v-if="visible">
    <path v-for="v in items" :key="v.id"
      :d="triPath(v.lng, v.lat)"
      fill="#e11d48"
      :fill-opacity="selected?.layer === 'volcano' && selected?.feature?.id === v.id ? 1 : 0.75"
      :stroke="selected?.layer === 'volcano' && selected?.feature?.id === v.id ? '#fff' : '#7f1d1d'"
      stroke-width="0.2"
      class="cursor-pointer transition-all duration-150"
      @click.stop="emit('select', { layer: 'volcano', feature: v })" />
  </g>
</template>
