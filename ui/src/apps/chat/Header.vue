<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
  hasActive: { type: Boolean, default: false },
  remarks: { type: Array, default: () => [] },
  remarksLoading: { type: Boolean, default: false }
});

const emit = defineEmits(['rename', 'delete', 'load-remarks']);

const menuOpen = ref(false);
const remarksOpen = ref(false);

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
  if (menuOpen.value) remarksOpen.value = false;
}
function toggleRemarks() {
  if (!props.hasActive) return;
  remarksOpen.value = !remarksOpen.value;
  if (remarksOpen.value) {
    menuOpen.value = false;
    emit('load-remarks');
  }
}

function onDocClick(e) {
  if (menuOpen.value && !e.target.closest('.menu-pop') && !e.target.closest('.menu-trigger')) {
    menuOpen.value = false;
  }
  if (remarksOpen.value && !e.target.closest('.remarks-pop') && !e.target.closest('.remarks-trigger')) {
    remarksOpen.value = false;
  }
}

onMounted(() => document.addEventListener('click', onDocClick));
onBeforeUnmount(() => document.removeEventListener('click', onDocClick));

function onRename() {
  menuOpen.value = false;
  emit('rename');
}
function onDelete() {
  menuOpen.value = false;
  emit('delete');
}
</script>

<template>
  <div class="relative flex items-center gap-1">
    <!-- 备注按钮 + 浮层 -->
    <div class="relative">
      <button
        class="icon-btn remarks-trigger"
        :class="{ 'is-on': remarksOpen }"
        :disabled="!hasActive"
        title="对话要点"
        @click="toggleRemarks">
        <span class="msi sm">summarize</span>
      </button>
      <Transition name="pop">
        <div v-if="remarksOpen"
          class="remarks-pop absolute right-0 top-[calc(100%+6px)] z-20 flex w-80 max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-line/80 bg-white shadow-3"
          style="max-height: min(420px, calc(100vh - 120px))">
          <div class="flex flex-none items-baseline justify-between border-b border-line/60 px-4 pt-3.5 pb-2.5">
            <span class="text-[13px] font-semibold text-ink">对话要点</span>
            <span v-if="remarks.length" class="font-mono text-[11px] text-faint">{{ remarks.length }}</span>
          </div>
          <div class="flex-1 min-h-0 overflow-y-auto p-1.5">
            <div v-if="remarksLoading" class="px-3 py-6 text-center text-[12.5px] text-faint">加载中…</div>
            <div v-else-if="!remarks.length" class="px-3 py-6 text-center text-[12.5px] text-faint">还没有要点摘要</div>
            <div v-else class="flex flex-col gap-1">
              <div v-for="r in remarks" :key="r.id"
                class="rounded-lg bg-bg-elev px-3 py-2.5 text-[13px] leading-[1.55] text-ink">
                {{ r.remark }}
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 更多菜单 -->
    <div class="relative">
      <button
        class="icon-btn menu-trigger"
        :class="{ 'is-on': menuOpen }"
        :disabled="!hasActive"
        title="更多"
        @click="toggleMenu">
        <span class="msi sm">more_vert</span>
      </button>
      <Transition name="pop">
        <div v-if="menuOpen"
          class="menu-pop absolute right-0 top-[calc(100%+6px)] z-20 min-w-[180px] overflow-hidden rounded-2xl border border-line/80 bg-white p-1.5 shadow-3">
          <button
            class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] text-ink transition-colors hover:bg-[var(--bg-hover)]"
            @click="onRename">
            <span class="msi sm text-muted">edit</span>
            <span>重命名</span>
          </button>
          <button
            class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] text-bad transition-colors hover:bg-bad/10"
            @click="onDelete">
            <span class="msi sm">delete</span>
            <span>删除对话</span>
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.icon-btn.is-on { background: var(--accent-soft); color: var(--accent-fg); }
.icon-btn:disabled { opacity: 0.35; cursor: default; }
.icon-btn:disabled:hover { background: transparent; }

.pop-enter-active, .pop-leave-active { transition: opacity .12s, transform .12s; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(-4px) scale(0.98); }
</style>
