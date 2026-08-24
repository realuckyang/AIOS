<script setup>
// 应用中心 (⚏) 触发按钮 —— 各 app 自己 import,放到自己的顶栏里
// 弹层本体在 AppsPopup.vue,挂在 App.vue 全局,跟这个按钮无耦合
import { useViewStore } from '@/stores/view.js';
const view = useViewStore();
</script>

<template>
  <button class="apps-trigger icon-btn lg" :class="{ active: view.appsOpen }"
    @click="view.toggleApps()" title="所有应用">
    <span class="msi">apps</span>
  </button>
</template>
