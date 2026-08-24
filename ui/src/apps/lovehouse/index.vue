<script setup>
import { onMounted, ref, nextTick, watch, computed } from 'vue';
import AppsTrigger from '@/components/AppsTrigger.vue';
import MessageList from './MessageList.vue';
import Composer from './Composer.vue';
import Setup from './Setup.vue';
import { useLovehouse } from './useLovehouse.js';

const {
  character, characterReady,
  messages, sending,
  loadCharacter, saveCharacter,
  loadMessages, sendMessage
} = useLovehouse();

const mainEl = ref(null);
const setupError = ref('');

const scrollToBottom = () => {
  nextTick(() => {
    if (mainEl.value) mainEl.value.scrollTop = mainEl.value.scrollHeight;
  });
};

const onSetupSubmit = async (form) => {
  setupError.value = '';
  const res = await saveCharacter(form);
  if (!res.success) {
    setupError.value = res.message || '保存失败, 请重试';
    return;
  }
  await loadMessages();
  scrollToBottom();
};

watch(() => messages.value.length, scrollToBottom);
watch(() => sending.value, scrollToBottom);
watch(() => character.value, async (c) => {
  if (c) {
    await loadMessages();
    scrollToBottom();
  }
}, { immediate: false });

onMounted(async () => {
  await loadCharacter();
});

const characterBio = computed(() => character.value?.bio || '');
</script>

<template>
  <!-- 角色就绪前: 空底, 避免 Setup / Chat 闪烁 -->
  <div v-if="!characterReady" class="flex-1 min-h-0 min-w-0 bg-pink-50"></div>

  <!-- 首次进入: 建立角色 -->
  <Setup v-else-if="!character" :external-error="setupError" @submit="onSetupSubmit" />

  <!-- 已有角色: 聊天界面 -->
  <div v-else
    class="relative flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden
           bg-gradient-to-b from-pink-50/80 to-white/90">

    <!-- 顶栏: 全宽, brand 贴左, AppsTrigger 贴右, 与其他 app 一致 -->
    <header class="flex-none h-14 px-4 flex items-center justify-between gap-3
                   bg-white/75 backdrop-blur-md backdrop-saturate-150">
      <div class="font-semibold text-base text-gray-900 truncate">{{ character.name }}</div>
      <AppsTrigger />
    </header>

    <!-- 主滚动区 -->
    <main ref="mainEl"
      class="relative flex-1 min-h-0 overflow-y-auto scroll-smooth
             [&::-webkit-scrollbar]:w-1.5
             [&::-webkit-scrollbar-thumb]:bg-pink-500/15
             [&::-webkit-scrollbar-thumb]:rounded-full">
      <div class="max-w-4xl mx-auto px-4 pb-6">

        <!-- 资料卡 -->
        <section class="pt-8 pb-4 flex flex-col items-center gap-4">
          <div class="relative inline-block">
            <span class="inline-flex items-center justify-center w-24 h-24 rounded-full text-[44px]
                         bg-gradient-to-br from-pink-100 to-pink-300
                         ring-4 ring-gray-50 shadow-sm">
              {{ character.avatar_emoji }}
            </span>
            <span class="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-green-400 ring-2 ring-white"></span>
          </div>
          <h1 class="text-xl font-semibold text-gray-900">{{ character.name }}</h1>
          <div v-if="characterBio"
            class="text-sm font-medium bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400
                   bg-clip-text text-transparent">
            {{ characterBio }}
          </div>
        </section>

        <!-- 历史分隔线 -->
        <div v-if="messages.length" class="flex items-center gap-3 my-6">
          <div class="flex-1 h-px bg-gray-200"></div>
          <span class="text-[13px] italic text-gray-400 whitespace-nowrap">最近的消息</span>
          <div class="flex-1 h-px bg-gray-200"></div>
        </div>

        <MessageList :messages="messages" :sending="sending" />
      </div>
    </main>

    <Composer :sending="sending" @send="sendMessage" />
  </div>
</template>
