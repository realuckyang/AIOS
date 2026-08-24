<script setup>
import { computed, nextTick, ref } from 'vue';
import BubbleUser from './bubbles/User.vue';
import BubbleAi from './bubbles/Ai.vue';
import BubbleToolCall from './bubbles/ToolCall.vue';
import BubbleToolResult from './bubbles/ToolResult.vue';

defineProps({
  messages: { type: Array, default: () => [] },
  streaming: { type: Boolean, default: false },
  hasActive: { type: Boolean, default: false },
  errMsg: { type: String, default: '' }
});

const emit = defineEmits(['pick']);

const listEl = ref(null);
function scrollEnd() {
  nextTick(() => { if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight; });
}
defineExpose({ scrollEnd });

// ─── 欢迎页内容 ─────────────────────────────────
const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 5)  return { icon: '🌙', text: '深夜好' };
  if (h < 11) return { icon: '☀️', text: '早上好' };
  if (h < 13) return { icon: '🌤', text: '中午好' };
  if (h < 18) return { icon: '🌻', text: '下午好' };
  if (h < 22) return { icon: '🌆', text: '晚上好' };
  return { icon: '🌙', text: '夜里好' };
});

const suggests = [
  { icon: 'edit_note',     label: '帮我写点东西',  prompt: '帮我写一段……' },
  { icon: 'lightbulb',     label: '给我一些灵感',  prompt: '给我一些关于……的灵感' },
  { icon: 'summarize',     label: '总结一下',      prompt: '帮我总结一下……' },
  { icon: 'code',          label: '写段代码',      prompt: '用 ____ 写一段代码,实现……' },
  { icon: 'translate',     label: '翻译',          prompt: '把下面这段翻译成……\n\n' },
  { icon: 'school',        label: '解释一个概念',  prompt: '用通俗的话解释一下:' }
];

const pick = (s) => emit('pick', s.prompt);
</script>

<template>
  <div ref="listEl"
    class="msgs flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 pt-2 pb-6 max-md:px-3 max-md:pb-4">

    <!-- 欢迎页 (没选中对话 & 没消息 & 没错误) -->
    <div v-if="!hasActive && !errMsg && !messages.length"
      class="welcome relative mx-auto flex min-h-full max-w-[640px] flex-col items-center px-4 text-center">

      <!-- 顶部光晕 -->
      <div class="welcome-halo"></div>

      <div class="welcome-emoji">{{ greeting.icon }}</div>
      <h1 class="welcome-greeting">{{ greeting.text }}</h1>
      <p class="welcome-sub">今天想聊点什么?</p>

      <div class="welcome-suggests">
        <button
          v-for="s in suggests"
          :key="s.label"
          class="welcome-chip"
          type="button"
          @click="pick(s)">
          <span class="msi">{{ s.icon }}</span>
          <span>{{ s.label }}</span>
        </button>
      </div>

      <div class="welcome-tip">
        <span class="msi text-[14px] align-[-2px]">arrow_downward</span>
        在下方输入框开始一段新对话
      </div>
    </div>

    <template v-for="(m, i) in messages" :key="m._key || i">
      <BubbleUser     v-if="m.role === 'user'"            :text="m.text" :attachments="m.attachments" />
      <BubbleAi       v-else-if="m.role === 'ai' && m.text" :text="m.text" :remark="m.remark" />
      <BubbleToolCall v-else-if="m.type === 'tool_call'"  :msg="m" />
      <BubbleToolResult v-else-if="m.type === 'tool_result'" :content="m.content" />
    </template>

    <!-- 流式期间的「思考中」指示 -->
    <div v-if="streaming" class="px-1 py-1.5 text-[13px] text-faint">
      思考中<span class="ml-0.5 inline-block tracking-[2px] animate-[chat-pulse_1.2s_ease-in-out_infinite]">…</span>
    </div>
  </div>
</template>

<style scoped>
.msgs > * + * { margin-top: 12px; }
.msgs > .welcome + * { margin-top: 0; }

@keyframes chat-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

/* ─── 欢迎页 ─────────────────────────── */
.welcome {
  user-select: none;
  padding-top: clamp(28px, 10vh, 96px);
  padding-bottom: 32px;
}
@media (min-width: 768px) {
  /* 桌面端: 内容竖直居中 (用 min-h-full + flex 弹性留白) */
  .welcome { justify-content: center; }
}

.welcome-halo {
  position: absolute;
  top: 0;
  left: 50%;
  width: min(420px, 90vw);
  height: 420px;
  transform: translateX(-50%);
  background: radial-gradient(circle, rgba(26, 115, 232, 0.10) 0%, transparent 65%);
  filter: blur(20px);
  pointer-events: none;
  z-index: 0;
}

.welcome > *:not(.welcome-halo) { position: relative; z-index: 1; }

.welcome-emoji {
  font-size: 56px;
  line-height: 1;
  margin-bottom: 14px;
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.08));
  animation: bob 4s ease-in-out infinite;
}
@keyframes bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.welcome-greeting {
  font-size: 28px;
  font-weight: 500;
  letter-spacing: -0.02em;
  background: linear-gradient(90deg, #1a73e8 0%, #6c5ce7 50%, #d63384 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin: 0 0 6px;
}
.welcome-sub {
  font-size: 14px;
  color: var(--ink-mute, rgba(0, 0, 0, 0.55));
  margin: 0 0 24px;
}

.welcome-suggests {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
  max-width: 460px;
  margin-bottom: 28px;
}
@media (max-width: 520px) {
  .welcome-suggests { grid-template-columns: 1fr; }
}

.welcome-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--bg-elev, #ffffff);
  border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
  border-radius: 14px;
  text-align: left;
  font-size: 14px;
  color: var(--ink, #1f1f1f);
  cursor: pointer;
  transition: transform 0.12s, border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.welcome-chip:hover {
  border-color: rgba(26, 115, 232, 0.35);
  background: rgba(26, 115, 232, 0.04);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px -8px rgba(26, 115, 232, 0.35);
}
.welcome-chip .msi {
  font-family: 'Material Symbols Outlined';
  font-size: 20px;
  color: #1a73e8;
  flex: none;
}

.welcome-tip {
  font-size: 12.5px;
  color: var(--ink-mute, rgba(0, 0, 0, 0.45));
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
