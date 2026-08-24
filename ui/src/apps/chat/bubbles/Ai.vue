<script setup>
import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });
const renderMd = (text) => marked.parse(text || '');

defineProps({
  text: { type: String, default: '' },
  remark: { type: String, default: null }
});
</script>

<template>
  <div class="chat-scroll-bubble mr-auto max-w-[720px] rounded-2xl rounded-tl-[4px] bg-[#f0f4f9] px-3.5 py-2.5 text-[14px] leading-[1.55]">
    <div class="md" v-html="renderMd(text)" />
    <div v-if="remark"
      class="mt-2.5 border-t border-dashed border-line pt-2 text-[12.5px] italic leading-[1.55] text-faint">
      {{ remark }}
    </div>
  </div>
</template>

<style scoped>
.chat-scroll-bubble {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}
.chat-scroll-bubble::-webkit-scrollbar { display: none; }
.md { min-width: max-content; }
:deep(.md p) { margin: 0 0 0.6em; }
:deep(.md p:last-child) { margin-bottom: 0; }
:deep(.md pre) {
  background: #fff;
  padding: 10px 12px;
  border-radius: 10px;
  overflow-x: auto;
  font-size: 12.5px;
  line-height: 1.55;
  margin: 8px 0;
}
:deep(.md code) {
  background: rgba(60, 64, 67, 0.08);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 13px;
}
:deep(.md pre code) { background: transparent; padding: 0; }
:deep(.md ul), :deep(.md ol) { margin: 0.4em 0; padding-left: 1.5em; }
:deep(.md a) { color: var(--accent); text-decoration: underline; }
</style>
