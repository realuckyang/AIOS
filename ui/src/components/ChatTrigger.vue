<script setup>
// 聊天 (💬) 触发按钮 —— 各 app 自己 import,放到自己的顶栏里
// chat app 不需要这个按钮(在自己里面再聊会套娃),所以 chat 不要 import 它
// 弹层本体在 QuickChat.vue,挂在 App.vue 全局
import { useViewStore } from '@/stores/view.js';
const view = useViewStore();
</script>

<template>
  <button class="chat-trigger icon-btn lg" :class="{ active: view.chatOpen }"
    @click="view.toggleChat()" title="问 AI">
    <span class="msi">chat_bubble_outline</span>
  </button>
</template>
