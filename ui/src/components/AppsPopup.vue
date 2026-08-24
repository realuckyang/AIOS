<script setup>
import { onBeforeUnmount, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useViewStore } from '@/stores/view.js';
import { apps } from '@/apps.js';

const view = useViewStore();
const router = useRouter();
const route = useRoute();

function go(id) {
  view.closeApps();
  const path = `/app/${id}`;
  if (route.path !== path) router.push(path);
}
function isActive(id) { return route.path === `/app/${id}`; }

function onDocClick(e) {
  if (!view.appsOpen) return;
  // 别让 AppsTrigger 按钮自己 toggle 时被 doc click 立即关上
  if (e.target.closest('.apps-trigger')) return;
  if (e.target.closest('[title="所有应用"]')) return;
  if (e.target.closest('.apps-popup')) return;
  view.closeApps();
}
function onEsc(e) { if (e.key === 'Escape') view.closeApps(); }
onMounted(() => {
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onEsc);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onEsc);
});
</script>

<template>
  <Transition name="apps-fade">
    <div v-if="view.appsOpen" class="apps-popup">
      <!-- 内嵌白色面板 -->
      <div class="inner-card">
        <header class="head">
          <div class="title">应用中心</div>
          <button class="edit-btn" title="添加应用">
            <span class="msi sm">add</span>
          </button>
        </header>
        <div class="grid">
          <button v-for="app in apps" :key="app.id"
            class="tile"
            :class="{ active: isActive(app.id) }"
            @click="go(app.id)">
            <span class="ic" :style="{ background: app.color }">
              <span class="msi" style="color:#fff">{{ app.icon }}</span>
            </span>
            <span class="name">{{ app.name }}</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.apps-popup {
  position: fixed;
  top: 60px; right: 12px;
  width: 360px; max-width: calc(100vw - 24px);
  max-height: calc(100vh - 80px);
  background: #ebeef5;
  border-radius: 28px;
  box-shadow: var(--shadow-3);
  z-index: 60;
  padding: 8px;
  display: flex; flex-direction: column;
  transform-origin: top right;
}
.apps-fade-enter-active { animation: pop-in 0.18s cubic-bezier(.2,.7,.2,1); }
.apps-fade-leave-active { animation: pop-in 0.12s reverse; }
@keyframes pop-in {
  from { opacity: 0; transform: scale(.92) translateY(-6px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* 白色卡 */
.inner-card {
  flex: 1; min-height: 0;
  background: #fff;
  border-radius: 22px;
  display: flex; flex-direction: column;
  overflow: hidden;
}

.head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px 10px;
  flex: none;
}
.head .title {
  font-size: 17px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--text);
}
.edit-btn {
  width: 36px; height: 36px;
  display: grid; place-items: center;
  border: 0; background: var(--accent-soft);
  color: var(--accent-fg);
  border-radius: 50%;
  cursor: pointer;
  transition: background .15s;
}
.edit-btn:hover { background: #d2e3fc; }

.grid {
  flex: 1; min-height: 0;
  overflow-y: auto;
  padding: 4px 8px 16px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
}
.tile {
  display: flex; flex-direction: column; align-items: center;
  gap: 8px;
  padding: 14px 4px 10px;
  border: 0; background: transparent;
  border-radius: 12px;
  color: var(--text);
  text-align: center;
  cursor: pointer;
  transition: background .15s;
}
.tile:hover { background: var(--bg-hover); }
.tile.active { background: var(--accent-soft); }
.tile .ic {
  width: 44px; height: 44px;
  display: grid; place-items: center;
  border-radius: 12px;
}
.tile .ic .msi { font-size: 24px; }
.tile .name {
  font-size: 12.5px;
  line-height: 1.2;
  color: var(--text);
}

@media (max-width: 720px) {
  .apps-popup {
    top: 56px; left: 8px; right: 8px; width: auto;
    border-radius: 24px;
  }
  .inner-card { border-radius: 18px; }
}
</style>
