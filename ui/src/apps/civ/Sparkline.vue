<script setup>
// 通用 sparkline. SVG path 自绘, 不依赖任何库.
import { computed } from 'vue';

const props = defineProps({
  data: { type: Array, default: () => [] },
  width: { type: Number, default: 80 },
  height: { type: Number, default: 22 },
  color: { type: String, default: '#22c55e' },
  fill: { type: Boolean, default: false }
});

const path = computed(() => {
  const a = props.data;
  if (!a?.length) return '';
  const min = Math.min(...a);
  const max = Math.max(...a);
  const span = max - min || 1;
  return a.map((v, i) => {
    const x = (i / Math.max(1, a.length - 1)) * props.width;
    const y = props.height - ((v - min) / span) * props.height;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
});

const fillPath = computed(() => {
  if (!props.fill || !path.value) return '';
  return `${path.value} L${props.width},${props.height} L0,${props.height} Z`;
});
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" :width="width" :height="height" preserveAspectRatio="none">
    <path v-if="fill" :d="fillPath" :fill="color" fill-opacity="0.16" stroke="none" />
    <path :d="path" fill="none" :stroke="color" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
