import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useViewStore = defineStore('view', () => {
  // 当前 app 内部侧栏开关.桌面默认开,手机默认关.
  // 全局 app 切换走右上角 ⚏(appsOpen),不再有"全局抽屉".
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const appDrawerOpen = ref(!isMobile);
  const appsOpen = ref(false);
  const chatOpen = ref(false);

  function toggleAppDrawer()  { appDrawerOpen.value = !appDrawerOpen.value; }
  function closeAppDrawer()   { appDrawerOpen.value = false; }
  function openAppDrawer()    { appDrawerOpen.value = true; }

  function toggleApps() {
    appsOpen.value = !appsOpen.value;
    if (appsOpen.value) chatOpen.value = false;
  }
  function closeApps() { appsOpen.value = false; }

  function toggleChat() {
    chatOpen.value = !chatOpen.value;
    if (chatOpen.value) appsOpen.value = false;
  }
  function closeChat() { chatOpen.value = false; }

  return {
    appDrawerOpen, appsOpen, chatOpen,
    toggleAppDrawer, closeAppDrawer, openAppDrawer,
    toggleApps, closeApps,
    toggleChat, closeChat
  };
});
