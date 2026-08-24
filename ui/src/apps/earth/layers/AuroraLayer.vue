<script setup>
import { onMounted, ref, watch } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false }
});
const emit = defineEmits(['count', 'meta']);

const points = ref([]);
async function load() {
  try {
    const r = await fetch('/apps/earth/aurora').then((x) => x.json());
    points.value = r.points || [];
    emit('count', points.value.length);
    emit('meta', { observed: r.observed, forecast: r.forecast });
  } catch {}
}
onMounted(() => { if (props.visible) load(); });
watch(() => props.visible, (v) => { if (v && !points.value.length) load(); });

// 用绿色梯度模拟极光带, 0~100 概率映射成不同饱和度的青绿
const auroraColor = (v) => {
  const a = Math.min(1, v / 80);
  return `rgba(80, 230, 130, ${a * 0.55})`;
};

defineExpose({ reload: load, points, layerKey: 'aurora' });
</script>

<template>
  <g v-if="visible">
    <rect v-for="(p, i) in points" :key="'a'+i"
      :x="p.lng - 0.5" :y="-p.lat - 0.5"
      width="1" height="1"
      :fill="auroraColor(p.value)"
      stroke="none"
      pointer-events="none" />
  </g>
</template>
