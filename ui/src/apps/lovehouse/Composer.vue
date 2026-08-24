<script setup>
import { nextTick, ref, watch } from 'vue';

const props = defineProps({
  sending: { type: Boolean, default: false }
});
const emit = defineEmits(['send']);

const textareaEl = ref(null);
const text = ref('');
const composing = ref(false);

const autoResize = () => {
  const el = textareaEl.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
};

const onKeydown = (e) => {
  if (e.key !== 'Enter') return;
  if (composing.value || e.isComposing || e.keyCode === 229) return;
  if (e.shiftKey) return;
  e.preventDefault();
  send();
};

const send = () => {
  const v = text.value.trim();
  if (!v || props.sending) return;
  emit('send', v);
  text.value = '';
  nextTick(() => { if (textareaEl.value) textareaEl.value.style.height = 'auto'; });
};

watch(text, autoResize);
</script>

<template>
  <div class="absolute inset-x-0 bottom-0 z-40 bg-white/75 backdrop-blur-md">
    <div class="max-w-4xl mx-auto px-4 pt-3 pb-4">
      <div class="flex items-center bg-gray-50 rounded-2xl pl-4 pr-1">
        <textarea
          ref="textareaEl"
          v-model="text"
          rows="1"
          :placeholder="sending ? '小桃在想…' : '悄悄说点什么…'"
          :disabled="sending"
          @keydown="onKeydown"
          @compositionstart="composing = true"
          @compositionend="composing = false"
          class="flex-1 bg-transparent border-0 outline-none resize-none
                 text-[15px] leading-snug text-gray-800 placeholder:text-gray-400
                 py-2 min-h-[36px] max-h-40
                 [&::-webkit-scrollbar]:w-1.5
                 [&::-webkit-scrollbar-thumb]:bg-black/10
                 [&::-webkit-scrollbar-thumb]:rounded-full" />

        <button type="button"
          :disabled="sending || !text.trim()"
          @click="send"
          aria-label="发送"
          :class="[
            'flex-none inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors',
            text.trim() && !sending
              ? 'text-blue-500 hover:text-blue-600 cursor-pointer'
              : 'text-gray-400 cursor-not-allowed'
          ]">
          <span class="msi sm">send</span>
        </button>
      </div>
    </div>
  </div>
</template>
