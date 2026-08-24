<script setup>
import { computed, ref } from 'vue';
import { useViewStore } from '@/stores/view.js';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';
import { landPaths } from './worldmap.js';

import EarthquakeLayer from './layers/EarthquakeLayer.vue';
import WildfireLayer from './layers/WildfireLayer.vue';
import VolcanoLayer from './layers/VolcanoLayer.vue';
import AuroraLayer from './layers/AuroraLayer.vue';

const view = useViewStore();

// 图层注册表 — 每条对应一个数据源 + 渲染组件
const LAYERS = [
  { id: 'earthquake', name: '地震',   icon: 'public',          color: '#7dd3fc', component: EarthquakeLayer },
  { id: 'wildfire',   name: '野火',   icon: 'local_fire_department', color: '#fb923c', component: WildfireLayer },
  { id: 'volcano',    name: '火山',   icon: 'landscape',       color: '#e11d48', component: VolcanoLayer },
  { id: 'aurora',     name: '极光',   icon: 'flare',           color: '#22c55e', component: AuroraLayer }
];

// 各图层显隐 + 计数
const visible = ref({ earthquake: true, wildfire: true, volcano: true, aurora: false });
const counts  = ref({ earthquake: 0, wildfire: 0, volcano: 0, aurora: 0 });
const auroraMeta = ref(null);

const selected = ref(null);  // { layer: 'earthquake', feature: {...} }

function toggle(id) {
  visible.value[id] = !visible.value[id];
  if (selected.value?.layer === id && !visible.value[id]) selected.value = null;
}

function pickFeature(payload) { selected.value = payload; }
function closeSelected() { selected.value = null; }

const layerRefs = ref({});
function bindRef(id, el) { if (el) layerRefs.value[id] = el; }

function reloadAll() {
  for (const l of LAYERS) {
    if (visible.value[l.id]) layerRefs.value[l.id]?.reload?.();
  }
}

// 选中态格式化
const selectedTitle = computed(() => {
  const s = selected.value;
  if (!s) return '';
  if (s.layer === 'earthquake') return `M${s.feature.mag} · ${s.feature.place}`;
  return s.feature.title || '';
});
const selectedSub = computed(() => {
  const s = selected.value;
  if (!s) return '';
  const t = s.feature.time ? new Date(s.feature.time).toLocaleString() : '';
  if (s.layer === 'earthquake') return `深度 ${s.feature.depth} km · ${t}${s.feature.tsunami ? ' · ⚠ 海啸预警' : ''}`;
  return t;
});
const selectedColor = computed(() => {
  const s = selected.value;
  if (!s) return '#94a3b8';
  return LAYERS.find((l) => l.id === s.layer)?.color || '#94a3b8';
});
</script>

<template>
  <div class="app-frame bg-[#050a14] text-[#c8d6e5]">

    <!-- ─── topbar ─── -->
    <header class="flex h-16 flex-none items-center px-4 max-md:h-14 max-md:px-2">
      <button class="icon-btn lg earth-icon-btn"
        :class="{ 'earth-icon-btn-on': view.appDrawerOpen }"
        @click="view.toggleAppDrawer()" title="侧栏">
        <span class="msi">menu</span>
      </button>
      <div class="ml-3 mr-1 flex min-w-0 flex-1 items-center gap-2 text-[18px] font-semibold tracking-wide text-white max-md:text-[15px]">
        <span class="text-base">🌍</span>
        <span class="truncate">地球</span>
      </div>
      <button class="icon-btn earth-icon-btn"
        title="刷新所有图层" @click="reloadAll">
        <span class="msi sm">refresh</span>
      </button>
      <div class="ml-1 flex items-center gap-1 dark-icons">
        <ChatTrigger />
        <AppsTrigger />
      </div>
    </header>

    <div class="app-body">
      <Transition name="mask"><div v-if="view.appDrawerOpen" class="app-side-mask" @click="view.closeAppDrawer()" /></Transition>

      <!-- ─── 侧栏:图层开关 ─── -->
      <aside class="app-side !bg-[#070d1a] !border-r-[#0d1320]"
        :class="{ collapsed: !view.appDrawerOpen }">
        <div class="app-side-inner">
          <div class="px-4 pt-4 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#576574]">图层</div>
          <div class="flex flex-col gap-0.5 px-2 pb-3">
            <button v-for="l in LAYERS" :key="l.id"
              class="layer-toggle"
              :class="{ on: visible[l.id] }"
              @click="toggle(l.id)">
              <span class="layer-dot" :style="{ background: l.color }"></span>
              <span class="msi sm" :style="{ color: visible[l.id] ? l.color : '#576574' }">{{ l.icon }}</span>
              <span class="flex-1 truncate text-left">{{ l.name }}</span>
              <span v-if="visible[l.id] && counts[l.id]" class="rounded-full bg-white/10 px-2 py-px text-[10.5px] tabular-nums text-white/80">{{ counts[l.id] }}</span>
              <span class="msi xxs eye" :class="{ 'eye-on': visible[l.id] }">{{ visible[l.id] ? 'visibility' : 'visibility_off' }}</span>
            </button>
          </div>

          <div v-if="visible.aurora && auroraMeta" class="border-t border-[#0d1320] px-4 py-3 text-[11px] text-[#576574]">
            <div class="mb-1 text-[10px] uppercase tracking-wider text-[#3d4a5e]">极光预报</div>
            <div>观测 {{ auroraMeta.observed?.replace('T', ' ').slice(0, 16) }}</div>
            <div>预报 {{ auroraMeta.forecast?.replace('T', ' ').slice(0, 16) }}</div>
          </div>
        </div>
      </aside>

      <!-- ─── 主区:整张地图 ─── -->
      <section class="relative flex-1 min-w-0 min-h-0 overflow-hidden bg-[#050a14]">

        <svg viewBox="-180 -90 360 180"
          class="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          @click="closeSelected">
          <rect x="-180" y="-90" width="360" height="180" fill="#050a14" />

          <!-- 经纬网 -->
          <g stroke="#0d1a30" stroke-width="0.2">
            <line v-for="lng in [-150,-120,-90,-60,-30,0,30,60,90,120,150]" :key="'lo'+lng" :x1="lng" y1="-90" :x2="lng" y2="90" />
            <line v-for="lat in [-60,-30,0,30,60]" :key="'la'+lat" x1="-180" :y1="-lat" x2="180" :y2="-lat" />
          </g>
          <line x1="-180" y1="0" x2="180" y2="0" stroke="#0f2240" stroke-width="0.3" />

          <!-- 陆地 -->
          <path v-for="(d, i) in landPaths" :key="'land'+i" :d="d" fill="#0f1d35" stroke="#1a3050" stroke-width="0.3" />

          <!-- 图层(z 顺序: aurora 最底, 火山次之, 野火, 地震最上) -->
          <component v-for="l in LAYERS" :key="l.id"
            :is="l.component"
            :ref="(el) => bindRef(l.id, el)"
            :visible="visible[l.id]"
            :selected="selected"
            @select="pickFeature"
            @count="(n) => (counts[l.id] = n)"
            @meta="(m) => (auroraMeta = m)" />
        </svg>

        <!-- 选中 popup -->
        <Transition name="fade">
          <div v-if="selected"
            class="absolute bottom-3 left-3 right-3 max-w-[560px] mx-auto rounded-xl border border-[#1a2332] bg-[#0c1426]/95 p-3 text-[#c8d6e5] backdrop-blur"
            @click.stop>
            <div class="flex items-start gap-3">
              <span class="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: selectedColor }"></span>
              <div class="min-w-0 flex-1">
                <div class="text-[14px] font-semibold leading-snug break-words">{{ selectedTitle }}</div>
                <div class="mt-1 text-[11.5px] text-[#576574] break-words">{{ selectedSub }}</div>
                <div v-if="selected.feature.sources?.length" class="mt-2 flex flex-wrap gap-1.5">
                  <a v-for="(s, i) in selected.feature.sources" :key="i" :href="s.url" target="_blank"
                    class="rounded bg-white/5 px-2 py-0.5 text-[10.5px] text-[#7dd3fc] hover:bg-white/10">
                    {{ s.id }}
                  </a>
                </div>
              </div>
              <button @click="closeSelected" class="text-[#576574] hover:text-[#c8d6e5] text-sm">✕</button>
            </div>
          </div>
        </Transition>

        <!-- 空图层提示 -->
        <div v-if="!Object.values(visible).some(Boolean)"
          class="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-[#3d4a5e]">
          左侧勾上一个图层就能看见数据
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.earth-icon-btn { color: #c8d6e5; }
.earth-icon-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
.earth-icon-btn-on { background: rgba(255,255,255,0.08); color: #fff; }
.dark-icons :deep(.icon-btn) { color: #c8d6e5; }
.dark-icons :deep(.icon-btn:hover) { background: rgba(255,255,255,0.08); color: #fff; }
.dark-icons :deep(.icon-btn.active) { background: rgba(125,211,252,0.18); color: #7dd3fc; }

/* 图层开关 */
.layer-toggle {
  display: flex; align-items: center; gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 10px;
  color: #c8d6e5;
  font-size: 13px;
  cursor: pointer;
  transition: background .12s, border-color .12s;
}
.layer-toggle:hover { background: rgba(255,255,255,0.04); }
.layer-toggle.on { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.08); }
.layer-dot {
  flex: none;
  width: 10px; height: 10px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.15);
  opacity: 0.6;
  transition: opacity .12s;
}
.layer-toggle.on .layer-dot { opacity: 1; }
.layer-toggle .eye {
  color: #3d4a5e;
  transition: color .12s;
}
.layer-toggle .eye.eye-on { color: #c8d6e5; }

.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
