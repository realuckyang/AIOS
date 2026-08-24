<script setup>
import { ref, computed } from 'vue';
import AppsTrigger from '@/components/AppsTrigger.vue';

const props = defineProps({
  externalError: { type: String, default: '' }
});
const emit = defineEmits(['submit']);

// 关系预设 (含默认性别推断, 用户可以再改)
const RELATIONS = [
  { value: 'lover',   emoji: '💕', label: '恋人',     hint: '亲密、会撒娇会吃醋', defaultGender: 'female' },
  { value: 'crush',   emoji: '🌷', label: '心动对象', hint: '暧昧期、欲言又止',   defaultGender: 'female' },
  { value: 'spouse',  emoji: '💍', label: '伴侣',     hint: '老夫老妻的烟火气',   defaultGender: 'female' },
  { value: 'friend',  emoji: '🤝', label: '好朋友',   hint: '直率、能聊正事',     defaultGender: 'other'  },
  { value: 'bestie',  emoji: '🍻', label: '死党',     hint: '损友式相处',         defaultGender: 'other'  },
  { value: 'sibling', emoji: '🌿', label: '兄弟姐妹', hint: '亲近的家人感',       defaultGender: 'other'  },
  { value: 'senior',  emoji: '☕', label: '年长者',   hint: '关心、稳重、有阅历', defaultGender: 'female' },
  { value: 'junior',  emoji: '🧸', label: '年幼者',   hint: '依赖、撒娇',         defaultGender: 'female' }
];

const GENDERS = [
  { value: 'female', label: '女' },
  { value: 'male',   label: '男' },
  { value: 'other',  label: '中性' }
];

const EMOJI_PRESETS = {
  female: ['🌸', '🌷', '🍑', '🦊', '🐱', '🦄', '☕', '🍰'],
  male:   ['🐺', '🐻', '🦁', '⚓', '🎸', '☕', '🏍️', '🍺'],
  other:  ['🌿', '🌙', '⭐', '☁️', '🍵', '📚', '🎧', '🐾']
};

const form = ref({
  relation: 'lover',
  gender: 'female',
  name: '',
  avatar_emoji: '🌸',
  bio: '',
  persona: ''
});

const errorMessage = ref('');
const isSubmitting = ref(false);

const emojiOptions = computed(() => EMOJI_PRESETS[form.value.gender] || EMOJI_PRESETS.other);

const pickRelation = (rel) => {
  form.value.relation = rel.value;
  form.value.gender = rel.defaultGender;
  const list = EMOJI_PRESETS[rel.defaultGender] || EMOJI_PRESETS.other;
  if (!list.includes(form.value.avatar_emoji)) form.value.avatar_emoji = list[0];
};

const pickGender = (g) => {
  form.value.gender = g;
  const list = EMOJI_PRESETS[g] || EMOJI_PRESETS.other;
  if (!list.includes(form.value.avatar_emoji)) form.value.avatar_emoji = list[0];
};

const submit = async () => {
  errorMessage.value = '';
  const name = form.value.name.trim();
  if (!name) {
    errorMessage.value = '请给 ta 取个名字';
    return;
  }
  isSubmitting.value = true;
  try {
    await emit('submit', { ...form.value, name });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="relative flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden
              bg-gradient-to-b from-pink-50/80 to-white/90">

    <!-- 顶栏: 全宽, brand 贴左, AppsTrigger 贴右, 与其他 app 一致 -->
    <header class="flex-none h-14 px-4 flex items-center justify-between gap-3
                   bg-white/75 backdrop-blur-md backdrop-saturate-150">
      <h1 class="text-base font-semibold text-gray-900 truncate">建立你的虚拟伴侣</h1>
      <AppsTrigger />
    </header>

    <!-- 滚动主区 -->
    <main class="flex-1 min-h-0 overflow-y-auto
                 [&::-webkit-scrollbar]:w-1.5
                 [&::-webkit-scrollbar-thumb]:bg-pink-500/15
                 [&::-webkit-scrollbar-thumb]:rounded-full">
      <div class="max-w-xl mx-auto px-4 pt-6 pb-12 flex flex-col gap-5">

        <!-- 头像预览 -->
        <div class="flex flex-col items-center gap-3 pt-3 pb-1">
          <span class="inline-flex items-center justify-center w-24 h-24 rounded-full text-[44px]
                       bg-gradient-to-br from-pink-100 to-pink-300
                       ring-4 ring-gray-50 shadow-sm">
            {{ form.avatar_emoji }}
          </span>
          <p class="text-[13px] text-gray-500">下方挑一个 ta 的样子</p>
        </div>

        <!-- 头像 emoji -->
        <section class="bg-white rounded-xl p-4 flex flex-col gap-3 shadow-sm">
          <label class="text-[13px] font-medium text-gray-700">头像</label>
          <div class="grid grid-cols-8 max-[480px]:grid-cols-6 gap-1.5">
            <button
              v-for="e in emojiOptions"
              :key="e"
              type="button"
              @click="form.avatar_emoji = e"
              :class="[
                'h-10 text-[22px] rounded-lg border bg-white cursor-pointer transition-all',
                form.avatar_emoji === e
                  ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-500/15'
                  : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50'
              ]">{{ e }}</button>
          </div>
        </section>

        <!-- 关系 -->
        <section class="bg-white rounded-xl p-4 flex flex-col gap-3 shadow-sm">
          <label class="text-[13px] font-medium text-gray-700">你和 ta 的关系</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="rel in RELATIONS"
              :key="rel.value"
              type="button"
              @click="pickRelation(rel)"
              :class="[
                'flex flex-col items-start gap-0.5 px-3 py-2.5 text-left rounded-[10px] border bg-white cursor-pointer transition-all',
                form.relation === rel.value
                  ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-500/15'
                  : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50'
              ]">
              <span class="text-xl">{{ rel.emoji }}</span>
              <span class="text-sm font-medium text-gray-800">{{ rel.label }}</span>
              <span class="text-xs text-gray-500">{{ rel.hint }}</span>
            </button>
          </div>
        </section>

        <!-- 性别 -->
        <section class="bg-white rounded-xl p-4 flex flex-col gap-3 shadow-sm">
          <label class="text-[13px] font-medium text-gray-700">性别</label>
          <div class="flex gap-2">
            <button
              v-for="g in GENDERS"
              :key="g.value"
              type="button"
              @click="pickGender(g.value)"
              :class="[
                'flex-1 py-2 rounded-full border bg-white text-sm cursor-pointer transition-all',
                form.gender === g.value
                  ? 'border-pink-500 bg-pink-50 text-pink-700 font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-pink-300 hover:text-gray-800'
              ]">{{ g.label }}</button>
          </div>
        </section>

        <!-- 文本字段 -->
        <section class="bg-white rounded-xl p-4 flex flex-col gap-4 shadow-sm">
          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-gray-700">名字</label>
            <input
              v-model="form.name"
              type="text"
              maxlength="20"
              placeholder="比如 小桃 / 阿凯"
              class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-800
                     outline-none transition-colors
                     focus:border-pink-500 focus:ring-2 focus:ring-pink-500/15" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-gray-700">
              一句话简介 <span class="text-xs text-gray-400 font-normal">(选填)</span>
            </label>
            <input
              v-model="form.bio"
              type="text"
              maxlength="40"
              placeholder="比如 温柔有趣 · 听得到内心的声音"
              class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-800
                     outline-none transition-colors
                     focus:border-pink-500 focus:ring-2 focus:ring-pink-500/15" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-gray-700">
              性格与设定 <span class="text-xs text-gray-400 font-normal">(选填)</span>
            </label>
            <textarea
              v-model="form.persona"
              rows="5"
              maxlength="500"
              placeholder="自由描述 ta 的性格、口头禅、爱好、忌讳"
              class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-800
                     resize-y min-h-24 leading-snug
                     outline-none transition-colors
                     focus:border-pink-500 focus:ring-2 focus:ring-pink-500/15"></textarea>
          </div>
        </section>

        <!-- 错误 -->
        <div v-if="errorMessage || props.externalError"
          class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-red-50 text-red-600 text-[13px]">
          <span class="msi sm">error_outline</span>
          <span>{{ errorMessage || props.externalError }}</span>
        </div>

        <!-- 提交 -->
        <button
          type="button"
          :disabled="isSubmitting || !form.name.trim()"
          @click="submit"
          class="inline-flex items-center justify-center gap-1.5 w-full py-3 rounded-lg
                 bg-gradient-to-r from-pink-500 to-pink-400 text-white text-[15px] font-medium
                 shadow-lg shadow-pink-500/40
                 hover:-translate-y-px transition
                 disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 disabled:cursor-not-allowed">
          <span v-if="isSubmitting" class="msi sm animate-spin">progress_activity</span>
          <span>{{ isSubmitting ? '正在创建…' : '创建并开始聊天' }}</span>
        </button>

      </div>
    </main>
  </div>
</template>
