<template>
  <div v-if="view !== 'list'" class="flex h-full w-full items-center justify-center bg-[#2b1d14]">
    <div class="clipboard-board relative flex h-[90%] w-full max-w-[500px] flex-col items-center rounded-t-2xl rounded-b-3xl">
      <div class="absolute top-[10px] z-30 flex w-[140px] flex-col items-center">
        <div class="clip-base relative h-[25px] w-full rounded border border-[#555]">
          <div class="rivet absolute left-[15px] top-[7px] h-2.5 w-2.5 rounded-full"></div>
          <div class="rivet absolute right-[15px] top-[7px] h-2.5 w-2.5 rounded-full"></div>
        </div>
        <div class="clip-jaw -mt-[5px] z-[35] h-5 w-[120px] rounded-b-[10px] border border-t-0 border-[#666]"></div>
      </div>

      <div class="legal-pad relative z-10 mt-10 min-h-0 w-[90%] flex-1 overflow-hidden rounded-b" :class="cardStyle(editorStyle).padCls">
        <div class="pad-binding absolute inset-x-0 top-0 h-4 border-b border-dashed border-white/20 shadow-[0_2px_3px_rgba(0,0,0,0.4)]"></div>
        <div class="absolute right-4 top-[25px] rotate-2 font-mono text-[13px] font-bold opacity-50" :class="cardStyle(editorStyle).inkCls">REC: {{ currentDate }}</div>
        <textarea
          ref="editorEl"
          :value="editorDraft"
          @input="$emit('update:editorDraft', $event.target.value)"
          class="absolute inset-0 resize-none border-none bg-transparent pb-4 pl-[55px] pr-4 pt-[50px] font-['Comic_Sans_MS','Chalkboard_SE',cursive] text-lg leading-[30px] tracking-wide outline-none placeholder:italic placeholder:opacity-30"
          :class="cardStyle(editorStyle).inkCls"
          :placeholder="t('notebook_editor_placeholder')"
          spellcheck="false"
        ></textarea>
      </div>

      <div class="bottom-zone z-40 flex w-full shrink-0 flex-col overflow-hidden rounded-b-3xl">
        <div class="ai-drawer overflow-hidden" :class="{ show: aiDrawerOpen }">
          <div class="ai-well mx-3 mt-2.5 flex flex-col overflow-hidden rounded">
            <div class="flex items-center border-b border-white/5 px-2.5 py-1.5">
              <div class="ai-tag flex items-center gap-1.5 text-[9px] font-bold tracking-widest text-[#c8a050]">{{ t('notebook_ai_polish') }}</div>
              <div v-if="aiResult && !aiLoading" class="ml-auto flex items-center gap-1.5">
                <button class="cursor-pointer rounded border-none bg-[linear-gradient(180deg,#4a7a40,#306828)] px-3.5 py-1 text-[11px] font-bold tracking-wider text-[#d0e8c0] [text-shadow:0_1px_1px_rgba(0,0,0,0.3)] shadow-[0_2px_0_rgba(20,50,10,0.5),inset_0_1px_0_rgba(200,255,200,0.12)] transition-all hover:bg-[linear-gradient(180deg,#5a8a50,#407838)] active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]" @click="$emit('apply-ai')">{{ t('notebook_apply_action') }}</button>
                <button class="cursor-pointer rounded border-none bg-white/[0.06] px-3.5 py-1 text-[11px] font-bold tracking-wider text-[rgba(200,160,100,0.5)] shadow-[0_2px_0_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.04)] transition-all hover:bg-white/[0.1] hover:text-[rgba(200,160,100,0.8)] active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]" @click="$emit('close-ai')">{{ t('notebook_close_action') }}</button>
              </div>
            </div>
            <div v-if="aiLoading" class="ai-loading flex items-center justify-center gap-2.5 px-3 py-4">
              <div class="quill-anim relative h-[18px] w-[18px]"></div>
              <div class="animate-pulse text-[11px] font-semibold tracking-widest text-[rgba(200,160,80,0.6)]">{{ t('notebook_ai_loading') }}</div>
            </div>
            <div v-else-if="aiResult" class="ai-body overflow-y-auto whitespace-pre-wrap px-3 py-2 font-['Comic_Sans_MS','Chalkboard_SE',cursive] text-sm leading-6 tracking-wide">{{ aiResult }}</div>
          </div>
        </div>

        <div class="tray-buttons flex shrink-0 items-stretch gap-2.5 px-4 py-2.5 pb-3.5">
          <button class="relative top-0 flex-1 cursor-pointer rounded-md border border-[#2a1808] bg-[linear-gradient(180deg,#6a5838,#4a3820,#3a2810)] px-2 py-2.5 text-[13px] font-bold tracking-[0.06em] text-[rgba(255,220,180,0.5)] [text-shadow:0_1px_1px_rgba(0,0,0,0.5)] shadow-[0_3px_0_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.12)] transition-all hover:bg-[linear-gradient(180deg,#7a6848,#5a4830,#4a3820)] active:top-[3px] active:shadow-[0_0_0_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(0,0,0,0.4)] disabled:cursor-not-allowed disabled:opacity-40" @click="$emit('back')">{{ t('notebook_back') }}</button>
          <button class="relative top-0 flex-1 cursor-pointer rounded-md border border-[#1a0828] bg-[linear-gradient(180deg,#4a3848,#3a2838,#2a1828)] px-2 py-2.5 text-[13px] font-bold tracking-[0.06em] text-[rgba(220,200,255,0.6)] [text-shadow:0_1px_1px_rgba(0,0,0,0.5)] shadow-[0_3px_0_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.12)] transition-all hover:bg-[linear-gradient(180deg,#5a4858,#4a3848,#3a2838)] active:top-[3px] active:shadow-[0_0_0_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(0,0,0,0.4)] disabled:cursor-not-allowed disabled:opacity-40" :disabled="!editorDraft.trim() || aiLoading" @click="$emit('optimize')">{{ t('notebook_optimize_action') }}</button>
          <button v-if="editingNoteId" class="relative top-0 flex-1 cursor-pointer rounded-md border border-[#3a0808] bg-[linear-gradient(180deg,#8a3028,#6a1818,#501010)] px-2 py-2.5 text-[13px] font-bold tracking-[0.06em] text-[rgba(255,200,180,0.7)] [text-shadow:0_1px_1px_rgba(0,0,0,0.5)] shadow-[0_3px_0_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.12)] transition-all hover:bg-[linear-gradient(180deg,#9a4038,#7a2828,#601818)] active:top-[3px] active:shadow-[0_0_0_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(0,0,0,0.4)] disabled:cursor-not-allowed disabled:opacity-40" @click="$emit('request-delete')">{{ t('notebook_delete_action') }}</button>
          <button class="relative top-0 flex-1 cursor-pointer rounded-md border border-[#604010] bg-[linear-gradient(180deg,#d0a848,#a88028,#886818)] px-2 py-2.5 text-[13px] font-bold tracking-[0.06em] text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.3)] shadow-[0_3px_0_rgba(80,50,10,0.6),inset_0_1px_1px_rgba(255,255,200,0.25)] transition-all hover:bg-[linear-gradient(180deg,#e0b858,#b89038,#988028)] active:top-[3px] active:shadow-[0_0_0_rgba(80,50,10,0.6),inset_0_2px_4px_rgba(0,0,0,0.4)] disabled:cursor-not-allowed disabled:opacity-40" :disabled="saving || !editorDraft.trim()" @click="$emit('save')">
            {{ saving ? '...' : t('notebook_save_action') }}
          </button>
        </div>
      </div>

      <Transition name="ai-modal">
        <div v-if="showDeleteConfirm" class="absolute inset-0 z-50 flex items-center justify-center rounded-t-2xl rounded-b-3xl" @click.self="$emit('cancel-delete')">
          <div class="ai-modal-backdrop absolute inset-0 rounded-t-2xl rounded-b-3xl"></div>
          <div class="ai-modal-card relative z-10 mx-8 flex w-full max-w-[320px] flex-col items-center overflow-hidden rounded-xl px-6 py-6">
            <div class="mb-4 text-sm font-semibold text-[rgba(255,200,160,0.8)]">{{ t('notebook_delete_confirm') }}</div>
            <div class="flex w-full gap-3">
              <button class="relative top-0 flex-1 cursor-pointer rounded-md border border-[#2a1808] bg-[linear-gradient(180deg,#6a5838,#4a3820,#3a2810)] px-2 py-2.5 text-center text-[13px] font-bold tracking-[0.06em] text-[rgba(255,220,180,0.5)] [text-shadow:0_1px_1px_rgba(0,0,0,0.5)] shadow-[0_3px_0_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.12)] transition-all hover:bg-[linear-gradient(180deg,#7a6848,#5a4830,#4a3820)] active:top-[3px] active:shadow-[0_0_0_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(0,0,0,0.4)] disabled:cursor-not-allowed disabled:opacity-40" @click="$emit('cancel-delete')">{{ t('notebook_cancel_action') }}</button>
              <button class="relative top-0 flex-1 cursor-pointer rounded-md border border-[#3a0808] bg-[linear-gradient(180deg,#8a3028,#6a1818,#501010)] px-2 py-2.5 text-center text-[13px] font-bold tracking-[0.06em] text-[rgba(255,200,180,0.7)] [text-shadow:0_1px_1px_rgba(0,0,0,0.5)] shadow-[0_3px_0_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.12)] transition-all hover:bg-[linear-gradient(180deg,#9a4038,#7a2828,#601818)] active:top-[3px] active:shadow-[0_0_0_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(0,0,0,0.4)] disabled:cursor-not-allowed disabled:opacity-40" @click="$emit('confirm-delete')">{{ t('notebook_delete_action') }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue';
import { useI18n } from '../_shared/i18n.js';

const { t } = useI18n();

const props = defineProps({
  view: { type: String, required: true },
  editorDraft: { type: String, required: true },
  editingNoteId: { type: [String, Number, null], default: null },
  editorStyle: { type: Number, required: true },
  saving: { type: Boolean, required: true },
  aiDrawerOpen: { type: Boolean, required: true },
  aiLoading: { type: Boolean, required: true },
  aiResult: { type: String, required: true },
  showDeleteConfirm: { type: Boolean, required: true },
  currentDate: { type: String, required: true },
  cardStyle: { type: Function, required: true }
});

defineEmits([
  'back',
  'optimize',
  'request-delete',
  'cancel-delete',
  'confirm-delete',
  'save',
  'apply-ai',
  'close-ai',
  'update:editorDraft'
]);

const editorEl = ref(null);

watch(
  () => props.view,
  async (nextView) => {
    if (nextView === 'editor') {
      await nextTick();
      editorEl.value?.focus();
    }
  },
  { immediate: true }
);
</script>
