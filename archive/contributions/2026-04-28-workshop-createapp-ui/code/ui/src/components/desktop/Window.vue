<template>
  <div
    v-show="win.state !== 'minimized'"
    :style="windowStyle"
    class="window-frame fixed"
    @mousedown="onFocus"
  >
    <!-- 内部容器：裁剪圆角，resize 热区在外层不受影响 -->
    <div class="flex h-full w-full flex-col overflow-hidden" :class="win.state !== 'maximized' ? 'rounded-[12px]' : ''">
      <!-- 标题栏 -->
      <div
        class="title-bar flex h-9 shrink-0 cursor-default items-center border-b border-black/[0.07] px-3"
        @mousedown.left="startDrag"
        @dblclick="toggleMaximize"
      >
        <span class="min-w-0 flex-1 truncate text-xs font-semibold text-[#222]">{{ win.title }}</span>
        <div class="window-controls ml-3 flex h-full items-center" @mousedown.stop @dblclick.stop>
          <button
            type="button"
            class="window-control"
            title="__T_WINDOW_MINIMIZE__"
            @click.stop="doMinimize"
          >
            <Minus class="h-[14px] w-[14px]" :stroke-width="2" />
          </button>
          <button
            type="button"
            class="window-control"
            :title="win.state === 'maximized' ? '__T_WINDOW_RESTORE__' : '__T_WINDOW_MAXIMIZE__'"
            @click.stop="toggleMaximize"
          >
            <component
              :is="win.state === 'maximized' ? Minimize2 : Maximize2"
              class="h-[13px] w-[13px]"
              :stroke-width="2"
            />
          </button>
          <button
            type="button"
            class="window-control close"
            title="__T_WINDOW_CLOSE__"
            @click.stop="doClose"
          >
            <X class="h-[14px] w-[14px]" :stroke-width="2" />
          </button>
        </div>
      </div>

      <!-- 内容区 -->
      <div class="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <component :is="win.component" v-bind="win.props" />
      </div>
    </div>

    <!-- 缩放边框：四边 + 四角（在外层，不被 overflow-hidden 裁剪） -->
    <template v-if="win.state !== 'maximized'">
      <div class="absolute right-[-4px] top-2 bottom-2 w-2 cursor-ew-resize" @mousedown.stop.prevent="startResize($event, 'r')" />
      <div class="absolute bottom-[-4px] left-2 right-2 h-2 cursor-ns-resize" @mousedown.stop.prevent="startResize($event, 'b')" />
      <div class="absolute left-[-4px] top-2 bottom-2 w-2 cursor-ew-resize" @mousedown.stop.prevent="startResize($event, 'l')" />
      <div class="absolute top-[-4px] left-2 right-2 h-2 cursor-ns-resize" @mousedown.stop.prevent="startResize($event, 't')" />
      <div class="absolute bottom-[-4px] right-[-4px] h-3.5 w-3.5 cursor-se-resize" @mousedown.stop.prevent="startResize($event, 'br')" />
      <div class="absolute bottom-[-4px] left-[-4px] h-3.5 w-3.5 cursor-sw-resize" @mousedown.stop.prevent="startResize($event, 'bl')" />
      <div class="absolute top-[-4px] right-[-4px] h-3.5 w-3.5 cursor-ne-resize" @mousedown.stop.prevent="startResize($event, 'tr')" />
      <div class="absolute top-[-4px] left-[-4px] h-3.5 w-3.5 cursor-nw-resize" @mousedown.stop.prevent="startResize($event, 'tl')" />
    </template>

  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Maximize2, Minimize2, Minus, X } from 'lucide-vue-next';
import { windowManager } from '../../system/windows.js';

const props = defineProps({ win: { type: Object, required: true } });

const windowStyle = computed(() => {
  const w = props.win;
  if (w.state === 'maximized') {
    return { left: 0, top: 0, width: '100vw', height: 'calc(100vh - 46px)', zIndex: w.zIndex, borderRadius: 0, border: 'none' };
  }
  return {
    left: w.x + 'px', top: w.y + 'px',
    width: w.w + 'px', height: w.h + 'px',
    zIndex: w.zIndex
  };
});

function onFocus() {
  windowManager.focus(props.win.id);
}

function toggleMaximize() {
  windowManager.maximize(props.win.id);
}

function doMinimize() {
  windowManager.minimize(props.win.id);
}

function doClose() {
  windowManager.close(props.win.id);
}

// 拖拽
let dragOffset = null;
function startDrag(e) {
  if (props.win.state === 'maximized') return;
  dragOffset = { x: e.clientX - props.win.x, y: e.clientY - props.win.y };
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  windowManager.focus(props.win.id);
}

function onDrag(e) {
  const x = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 100));
  const y = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 40));
  windowManager.updatePosition(props.win.id, x, y);
}

function stopDrag() {
  dragOffset = null;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

// 缩放（支持8个方向）
let resizeState = null;

function startResize(e, direction) {
  resizeState = {
    dir: direction,
    startX: e.clientX,
    startY: e.clientY,
    origX: props.win.x,
    origY: props.win.y,
    origW: props.win.w,
    origH: props.win.h
  };
  document.addEventListener('mousemove', onResize);
  document.addEventListener('mouseup', stopResize);
  windowManager.focus(props.win.id);
}

function onResize(e) {
  const s = resizeState;
  const dx = e.clientX - s.startX;
  const dy = e.clientY - s.startY;
  const win = props.win;

  let newX = s.origX, newY = s.origY, newW = s.origW, newH = s.origH;

  if (s.dir.includes('r')) newW = s.origW + dx;
  if (s.dir.includes('b')) newH = s.origH + dy;
  if (s.dir.includes('l')) { newW = s.origW - dx; newX = s.origX + dx; }
  if (s.dir.includes('t')) { newH = s.origH - dy; newY = s.origY + dy; }

  if (newW < win.minW) {
    if (s.dir.includes('l')) newX = s.origX + s.origW - win.minW;
    newW = win.minW;
  }
  if (newH < win.minH) {
    if (s.dir.includes('t')) newY = s.origY + s.origH - win.minH;
    newH = win.minH;
  }

  windowManager.updatePosition(win.id, newX, newY);
  windowManager.updateSize(win.id, newW, newH);
}

function stopResize() {
  resizeState = null;
  document.removeEventListener('mousemove', onResize);
  document.removeEventListener('mouseup', stopResize);
}
</script>

<style scoped>
.window-frame {
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: 0 12px 48px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06);
}

.title-bar {
  background: #ffffff;
}

.window-controls {
  color: #4a4a4a;
}

.window-control {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 28px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: currentColor;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.window-control:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #111;
}

.window-control.close:hover {
  background: #e81123;
  color: #fff;
}
</style>
