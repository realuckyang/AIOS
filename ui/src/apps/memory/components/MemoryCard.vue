<template>
  <div
    class="relative cursor-default transition-all duration-200 hover:z-10 hover:scale-[1.02]"
    :class="item.enabled ? '' : 'opacity-[0.4]'"
    :style="noteStyle"
  >
    <!-- Paper line texture -->
    <div class="pointer-events-none absolute inset-0" style="background:repeating-linear-gradient(0deg,transparent 0px,transparent 23px,rgba(0,0,0,0.015) 23px,rgba(0,0,0,0.015) 24px);border-radius:inherit"></div>
    <!-- Fold corner -->
    <div class="absolute bottom-0 right-0 h-5 w-5" style="background:linear-gradient(135deg,transparent 50%,rgba(0,0,0,0.04) 50%);border-radius:0 0 3px 0"></div>

    <!-- Decoration: tape or pin -->
    <div v-if="decoType === 'tape'" class="absolute -top-[7px] left-1/2 h-4 w-12 -translate-x-1/2 rounded-sm" :style="`background:${tapeColor};opacity:0.45`"></div>
    <div v-else-if="decoType === 'pin-left'" class="absolute -top-1 left-3.5 text-[16px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]">📌</div>
    <div v-else class="absolute -top-1 right-3.5 text-[16px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]">📍</div>

    <!-- Content -->
    <div class="pt-[10px]">
      <div
        class="mb-1 cursor-pointer truncate leading-tight transition-colors"
        style="font-size:18px;font-weight:700;color:rgba(0,0,0,0.72);font-family:'Caveat','Segoe Print','Comic Sans MS',cursive"
        @click="$emit('edit')"
      >{{ item.title }}</div>

      <div
        v-if="item.description"
        class="mb-3 cursor-pointer line-clamp-3"
        style="font-size:14px;line-height:1.55;color:rgba(0,0,0,0.35);font-family:'Caveat','Segoe Print','Comic Sans MS',cursive"
        @click="$emit('edit')"
      >{{ item.description }}</div>

      <!-- Footer -->
      <div class="flex items-center gap-1 border-t pt-2" style="border-color:rgba(0,0,0,0.06)">
        <span class="text-[12px] tabular-nums" style="color:rgba(0,0,0,0.18);font-family:'Caveat',cursive">{{ formatTime(item.created_at) }}</span>
        <div class="ml-auto flex items-center gap-[3px]">
          <button
            class="rounded-xl px-2 py-[2px] text-[11px] font-semibold transition-all hover:brightness-[0.93]"
            :style="item.enabled
              ? 'background:rgba(255,255,255,0.5);color:rgba(30,120,55,0.65);box-shadow:0 1px 2px rgba(0,0,0,0.05)'
              : 'background:rgba(255,255,255,0.3);color:rgba(0,0,0,0.22)'"
            style="font-family:'Caveat',cursive"
            @click="$emit('toggle-enable')"
          >{{ item.enabled ? '✓ 启用' : '○ 已停用' }}</button>

          <button
            class="rounded-xl px-2 py-[2px] text-[11px] font-semibold transition-all hover:brightness-[0.93]"
            :style="item.pinned
              ? 'background:rgba(255,255,255,0.5);color:rgba(180,110,20,0.7);box-shadow:0 1px 2px rgba(0,0,0,0.05)'
              : 'background:rgba(255,255,255,0.3);color:rgba(0,0,0,0.22)'"
            style="font-family:'Caveat',cursive"
            @click="$emit('toggle-pin')"
          >{{ item.pinned ? '📌 置顶' : '☆ 置顶' }}</button>

          <button
            class="rounded-xl px-2 py-[2px] text-[11px] font-semibold transition-all hover:brightness-[0.93]"
            style="background:rgba(255,255,255,0.3);color:rgba(200,60,60,0.3);font-family:'Caveat',cursive"
            @click="$emit('delete')"
          >删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  item: { type: Object, required: true }
});

defineEmits(['edit', 'toggle-pin', 'toggle-enable', 'delete']);

const NOTES = [
  { bg: '#fff9c4', shadow: 'rgba(200,180,60,0.18)', tape: '#e8d44d' },
  { bg: '#fce4ec', shadow: 'rgba(200,100,120,0.15)', tape: '#f0a0b0' },
  { bg: '#e8f5e9', shadow: 'rgba(80,160,100,0.14)', tape: '#8cc898' },
  { bg: '#e3f2fd', shadow: 'rgba(80,140,220,0.14)', tape: '#90c0f0' },
  { bg: '#f3e5f5', shadow: 'rgba(160,100,200,0.14)', tape: '#c8a0e0' },
  { bg: '#fff3e0', shadow: 'rgba(220,160,60,0.16)', tape: '#f0c070' },
  { bg: '#e0f7fa', shadow: 'rgba(60,180,200,0.14)', tape: '#70d0e0' },
  { bg: '#fbe9e7', shadow: 'rgba(200,120,80,0.14)', tape: '#e0a888' },
];
const ROTATIONS = [-1.8, 1.2, -0.6, 1.5, -1, 0.8, -1.4, 0.5];
const DECOS = ['pin-left', 'pin-right', 'tape', 'tape', 'pin-left', 'tape', 'pin-right', 'tape'];

const note = computed(() => NOTES[props.item.id % NOTES.length]);
const rotation = computed(() => ROTATIONS[props.item.id % ROTATIONS.length]);
const decoType = computed(() => DECOS[props.item.id % DECOS.length]);
const tapeColor = computed(() => note.value.tape);

const noteStyle = computed(() => [
  `background:${note.value.bg}`,
  `box-shadow:2px 3px 10px ${note.value.shadow},0 1px 2px rgba(0,0,0,0.04)`,
  `border-radius:3px`,
  `padding:14px 16px 12px`,
  `transform:rotate(${rotation.value}deg)`,
].join(';'));

const formatTime = (v) => {
  if (!v) return '';
  const d = new Date(String(v).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};
</script>
