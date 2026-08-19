<template>
  <div
    class="createapp-shell flex h-full flex-col text-[#18242f]"
  >
    <div class="shrink-0 px-7 pb-5 pt-7">
      <div class="mx-auto max-w-[640px]">
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#102033] text-white shadow-[0_8px_22px_rgba(16,32,51,0.18)]">
            <Sparkles class="h-[17px] w-[17px]" :stroke-width="1.9" />
          </div>
          <div class="min-w-0">
            <h2 class="text-[24px] font-semibold leading-tight text-[#102033]">__T_CREATEAPP_TITLE__</h2>
            <p class="mt-1 text-[13px] leading-[1.55] text-[#607080]">__T_CREATEAPP_SUBTITLE__</p>
          </div>
        </div>
      </div>

      <div class="prompt-box relative mx-auto mt-5 max-w-[640px]">
        <textarea
          ref="inputRef"
          v-model="prompt"
          rows="3"
          class="prompt-input w-full resize-none border bg-white px-4 py-3.5 pr-[120px] text-[13.5px] leading-[1.65] text-[#17212b] outline-none transition placeholder:text-[#9aa7b4]"
          placeholder="__T_CREATEAPP_PLACEHOLDER__"
          @compositionstart="composing = true"
          @compositionend="composing = false"
          @keydown.meta.enter.prevent="create"
          @keydown.ctrl.enter.prevent="create"
        />
        <button
          class="create-button absolute bottom-3 right-3 inline-flex h-8 items-center gap-1.5 px-3.5 text-[12px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-35"
          :disabled="!prompt.trim() || composing"
          @click="create"
        >
          __T_CREATEAPP_BUTTON__
          <ArrowRight class="h-[13px] w-[13px]" :stroke-width="2" />
        </button>
      </div>
    </div>

    <div class="shrink-0 px-7 pb-3">
      <div class="category-group mx-auto flex max-w-[640px] flex-wrap gap-1.5">
        <button
          v-for="cat in categories" :key="cat.key"
          class="category-button inline-flex items-center gap-1.5 border px-2.5 py-[5px] text-[11.5px] font-medium transition"
          :class="activeCategory === cat.key ? 'is-active' : ''"
          :style="{ '--accent': cat.color }"
          @click="activeCategory = cat.key"
        >
          <span class="category-mark">
            <component :is="cat.icon" class="h-[12px] w-[12px]" :stroke-width="2" />
          </span>
          {{ cat.label }}
        </button>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-7 pb-8 pt-1 [scrollbar-width:thin]">
      <div class="mx-auto grid max-w-[640px] grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2.5">
        <button
          v-for="tpl in filteredTemplates" :key="tpl.name"
          class="template-card group relative flex min-h-[116px] flex-col border bg-white px-3.5 pb-3.5 pt-3 text-left transition"
          :class="selectedTpl === tpl.name ? 'is-selected' : ''"
          :style="{ '--accent': categoryColor(tpl.cat) }"
          @click="selectTemplate(tpl)"
        >
          <div class="mb-2 flex items-center gap-2">
            <span class="template-icon flex h-8 w-8 shrink-0 items-center justify-center">
              <component :is="tpl.icon" class="h-[16px] w-[16px]" :stroke-width="1.9" />
            </span>
            <span class="min-w-0 truncate text-[13px] font-semibold text-[#15212d]">{{ tpl.name }}</span>
          </div>
          <p class="line-clamp-3 text-[11.5px] leading-[1.62] text-[#647485]">{{ tpl.desc }}</p>
        </button>
      </div>

      <div v-if="!filteredTemplates.length" class="py-10 text-center text-[12.5px] text-[#8b99a7]">
        __T_CREATEAPP_EMPTY_CATEGORY__
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import {
  AlarmClock,
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  CookingPot,
  Drama,
  Gamepad2,
  KanbanSquare,
  KeyRound,
  Layers3,
  Leaf,
  Map,
  Package,
  Palette,
  PanelsTopLeft,
  PenLine,
  ReceiptText,
  Regex,
  Sparkles,
  Swords,
  Timer,
  UsersRound,
  Wrench,
  Zap
} from 'lucide-vue-next';
import { openIntent } from '../../system/intent.js';

const prompt = ref('');
const composing = ref(false);
const inputRef = ref(null);
const activeCategory = ref('all');
const selectedTpl = ref(null);

const categories = [
  { key: 'all',          icon: Layers3,            label: '__T_CREATEAPP_CAT_ALL__',          color: '#334155' },
  { key: 'ai',           icon: Brain,              label: '__T_CREATEAPP_CAT_AI__',           color: '#4f46e5' },
  { key: 'tool',         icon: Wrench,             label: '__T_CREATEAPP_CAT_TOOL__',         color: '#0369a1' },
  { key: 'game',         icon: Gamepad2,           label: '__T_CREATEAPP_CAT_GAME__',         color: '#7c3aed' },
  { key: 'life',         icon: Leaf,               label: '__T_CREATEAPP_CAT_LIFE__',         color: '#15803d' },
  { key: 'business',     icon: BriefcaseBusiness,  label: '__T_CREATEAPP_CAT_BUSINESS__',     color: '#b45309' },
  { key: 'productivity', icon: Zap,                label: '__T_CREATEAPP_CAT_PRODUCTIVITY__', color: '#0e7490' }
];

const templates = [
  { cat: 'ai',           icon: ChartNoAxesCombined, name: '__T_CREATEAPP_TPL_COMPETITOR__', desc: '__T_CREATEAPP_TPL_COMPETITOR_DESC__' },
  { cat: 'ai',           icon: PenLine,             name: '__T_CREATEAPP_TPL_COPYWRITER__', desc: '__T_CREATEAPP_TPL_COPYWRITER_DESC__' },
  { cat: 'ai',           icon: ClipboardList,       name: '__T_CREATEAPP_TPL_PROPOSAL__',   desc: '__T_CREATEAPP_TPL_PROPOSAL_DESC__' },
  { cat: 'ai',           icon: UsersRound,          name: '__T_CREATEAPP_TPL_INTERVIEW__',  desc: '__T_CREATEAPP_TPL_INTERVIEW_DESC__' },
  { cat: 'ai',           icon: Map,                 name: '__T_CREATEAPP_TPL_MINDMAP__',    desc: '__T_CREATEAPP_TPL_MINDMAP_DESC__' },
  { cat: 'ai',           icon: Drama,               name: '__T_CREATEAPP_TPL_PERSONA__',    desc: '__T_CREATEAPP_TPL_PERSONA_DESC__' },
  { cat: 'tool',         icon: KeyRound,            name: '__T_CREATEAPP_TPL_PASSWORD__',   desc: '__T_CREATEAPP_TPL_PASSWORD_DESC__' },
  { cat: 'tool',         icon: Palette,             name: '__T_CREATEAPP_TPL_COLOR__',      desc: '__T_CREATEAPP_TPL_COLOR_DESC__' },
  { cat: 'tool',         icon: Regex,               name: '__T_CREATEAPP_TPL_REGEX__',      desc: '__T_CREATEAPP_TPL_REGEX_DESC__' },
  { cat: 'game',         icon: Gamepad2,            name: '__T_CREATEAPP_TPL_SNAKE__',      desc: '__T_CREATEAPP_TPL_SNAKE_DESC__' },
  { cat: 'game',         icon: PanelsTopLeft,       name: '__T_CREATEAPP_TPL_MEMORY__',     desc: '__T_CREATEAPP_TPL_MEMORY_DESC__' },
  { cat: 'game',         icon: Swords,              name: '__T_CREATEAPP_TPL_ADVENTURE__',  desc: '__T_CREATEAPP_TPL_ADVENTURE_DESC__' },
  { cat: 'life',         icon: CookingPot,          name: '__T_CREATEAPP_TPL_RECIPE__',     desc: '__T_CREATEAPP_TPL_RECIPE_DESC__' },
  { cat: 'life',         icon: Timer,               name: '__T_CREATEAPP_TPL_COUNTDOWN__',  desc: '__T_CREATEAPP_TPL_COUNTDOWN_DESC__' },
  { cat: 'business',     icon: Package,             name: '__T_CREATEAPP_TPL_INVENTORY__',  desc: '__T_CREATEAPP_TPL_INVENTORY_DESC__' },
  { cat: 'business',     icon: ReceiptText,         name: '__T_CREATEAPP_TPL_QUOTE__',      desc: '__T_CREATEAPP_TPL_QUOTE_DESC__' },
  { cat: 'business',     icon: UsersRound,          name: '__T_CREATEAPP_TPL_CRM__',        desc: '__T_CREATEAPP_TPL_CRM_DESC__' },
  { cat: 'productivity', icon: CalendarDays,        name: '__T_CREATEAPP_TPL_CALENDAR__',   desc: '__T_CREATEAPP_TPL_CALENDAR_DESC__' },
  { cat: 'productivity', icon: KanbanSquare,        name: '__T_CREATEAPP_TPL_BOARD__',      desc: '__T_CREATEAPP_TPL_BOARD_DESC__' },
  { cat: 'productivity', icon: AlarmClock,          name: '__T_CREATEAPP_TPL_POMODORO__',   desc: '__T_CREATEAPP_TPL_POMODORO_DESC__' }
];

const filteredTemplates = computed(() =>
  activeCategory.value === 'all' ? templates : templates.filter(t => t.cat === activeCategory.value)
);

const categoryColor = (key) => categories.find(cat => cat.key === key)?.color || '#2563eb';

const selectTemplate = (tpl) => {
  prompt.value = tpl.desc;
  selectedTpl.value = tpl.name;
  inputRef.value?.focus();
};

const create = () => {
  if (!prompt.value.trim() || composing.value) return;
  openIntent({
    app: 'chat',
    action: 'open_new_and_send',
    data: { message: prompt.value.trim() }
  });
  prompt.value = '';
  selectedTpl.value = null;
};
</script>

<style scoped>
.createapp-shell {
  background:
    radial-gradient(circle at 16% -10%, rgba(45, 212, 191, 0.18), transparent 34%),
    radial-gradient(circle at 100% 0%, rgba(96, 165, 250, 0.14), transparent 32%),
    linear-gradient(180deg, #f8fbfc 0%, #f3f7f7 100%);
}

.prompt-box {
  filter: drop-shadow(0 14px 34px rgba(15, 32, 48, 0.08));
}

.prompt-input {
  min-height: 108px;
  border-color: #dbe4ec;
  border-radius: 8px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.prompt-input:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.create-button {
  border-radius: 8px;
  background: linear-gradient(135deg, #102033 0%, #0f766e 100%);
  box-shadow: 0 8px 20px rgba(15, 118, 110, 0.22);
}

.create-button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(15, 118, 110, 0.28);
}

.category-group {
  position: relative;
}

.category-group::before {
  content: "";
  position: absolute;
  inset: -8px 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.34), transparent);
}

.category-button {
  border-color: rgba(221, 230, 238, 0.86);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
  color: #5d6c7b;
  box-shadow: 0 1px 2px rgba(15, 32, 48, 0.03);
}

.category-button:hover {
  border-color: color-mix(in srgb, var(--accent) 36%, #dde6ee);
  color: #17212b;
}

.category-button.is-active {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
  box-shadow: 0 5px 14px color-mix(in srgb, var(--accent) 24%, transparent);
}

.category-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.category-button.is-active .category-mark {
  color: currentColor;
}

.template-card {
  border-color: #dfe7ef;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(15, 32, 48, 0.03);
}

.template-card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  border-radius: 8px 0 0 8px;
  background: var(--accent);
  opacity: 0.35;
}

.template-card:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent) 38%, #dfe7ef);
  box-shadow: 0 10px 24px rgba(15, 32, 48, 0.08);
}

.template-card.is-selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 13%, transparent), 0 10px 24px rgba(15, 32, 48, 0.08);
}

.template-icon {
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent) 18%, #dfe7ef);
  background: color-mix(in srgb, var(--accent) 8%, #fff);
  color: var(--accent);
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}

.template-card:hover .template-icon,
.template-card.is-selected .template-icon {
  border-color: color-mix(in srgb, var(--accent) 30%, #dfe7ef);
  background: color-mix(in srgb, var(--accent) 14%, #fff);
}
</style>
