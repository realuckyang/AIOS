<template>
  <div v-if="view === 'list'" class="cork-surface relative flex h-full w-full flex-wrap content-start justify-center md:justify-start gap-[30px] overflow-y-auto overflow-x-hidden p-10">
    <div class="group z-20 flex h-[240px] w-[200px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-t-lg rounded-b-xl border border-[#3a2515] bg-[#5c412a] shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),4px_8px_15px_rgba(0,0,0,0.6)] transition-all hover:scale-[1.02] hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),6px_12px_20px_rgba(0,0,0,0.7)]" style="transform:rotate(-2deg)" @click="$emit('open-editor', null)">
      <div class="absolute top-[5px] h-4 w-[60px] rounded-sm bg-[#888] shadow-[0_4px_6px_rgba(0,0,0,0.6)]"></div>
      <div class="mt-5 flex h-[85%] w-[85%] items-center justify-center rounded-sm bg-[rgba(253,245,211,0.9)] shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
        <span class="text-[40px] font-bold text-[#a33] opacity-70">+</span>
      </div>
    </div>

    <div
      v-for="(note, idx) in notes"
      :key="note.id"
      class="memo-card group relative z-10 shrink-0 cursor-pointer transition-all hover:z-40 hover:!scale-105 hover:!-translate-y-1"
      :class="cardStyle(note.style).cardCls"
      :style="{ transform: `rotate(${rotations[idx % 8]}deg)` }"
      @click="$emit('open-editor', note)"
    >
      <div v-if="idx % 3 !== 1" class="pushpin absolute left-1/2 top-[10px] z-20 h-3.5 w-3.5 -translate-x-1/2 rounded-full shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.4),inset_2px_2px_4px_rgba(255,255,255,0.6),3px_10px_6px_rgba(0,0,0,0.3)]" :class="pinColors[note.style % 4]"></div>
      <div v-else class="pointer-events-none absolute -top-2.5 left-1/2 z-10 h-5 w-[50px] border-x-2 border-dashed border-white/60 bg-white/35 shadow-sm backdrop-blur-[1px]" :style="{ transform: `translateX(-50%) rotate(${idx % 2 ? 5 : -5}deg)` }"></div>
      <div class="line-clamp-[8] whitespace-pre-wrap break-words px-3 font-['Comic_Sans_MS','Chalkboard_SE',cursive] text-base leading-[25px]" :class="cardStyle(note.style).textCls">
        {{ note.content || t('notebook_empty_card') }}
      </div>
      <div class="absolute bottom-2 right-2.5 font-mono text-[10px] font-bold text-black/40">
        {{ formatTime(note.updated_at || note.created_at) }}
      </div>
      <button class="absolute -right-2 -top-2 z-30 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs text-white opacity-0 shadow-md transition-all hover:scale-110 hover:bg-red-700 group-hover:opacity-100" @click.stop="$emit('delete-note', note.id)">✕</button>
    </div>

    <div class="h-10 w-full"></div>

    <div v-if="totalPages > 1" class="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-lg bg-black/40 px-4 py-1.5 text-xs text-[#d4c0a0] backdrop-blur-sm">
      <button class="px-2 py-0.5 text-lg hover:text-white disabled:cursor-not-allowed disabled:opacity-30" :disabled="page <= 1 || loading" @click="$emit('prev-page')">‹</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button class="px-2 py-0.5 text-lg hover:text-white disabled:cursor-not-allowed disabled:opacity-30" :disabled="page >= totalPages || loading" @click="$emit('next-page')">›</button>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '../_shared/i18n.js';

const { t } = useI18n();

defineProps({
  view: { type: String, required: true },
  notes: { type: Array, required: true },
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  loading: { type: Boolean, required: true },
  cardStyle: { type: Function, required: true },
  formatTime: { type: Function, required: true },
  rotations: { type: Array, required: true },
  pinColors: { type: Array, required: true }
});

defineEmits(['open-editor', 'delete-note', 'prev-page', 'next-page']);
</script>
