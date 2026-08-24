<script setup>
// tasks 应用根 — 协调器, 不直接渲染任务条目
//   Sidebar.vue    ← 左侧 rail
//   AddBar.vue     ← 顶部输入条
//   TaskRow.vue    ← 单条任务行
//   TaskDetail.vue ← 详情视图
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue';
import { useViewStore } from '@/stores/view.js';
import * as api from '@/utils/api.js';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';

import Sidebar from './Sidebar.vue';
import AddBar from './AddBar.vue';
import TaskRow from './TaskRow.vue';
import TaskDetail from './TaskDetail.vue';

const view = useViewStore();

// ─── state ────────────────────────────────────────
const tasks       = ref([]);
const filter      = ref('all');
const errMsg      = ref('');
const loading     = ref(false);
const newTitle    = ref('');
const submitting  = ref(false);
const selectedId  = ref(null);
const detailFor   = ref(null);
const showCompleted = ref(true);
const detailCache = new Map();

const filters = [
  { id: 'all',     name: '所有任务',  icon: 'inbox' },
  { id: 'mine',    name: '我创建的',  icon: 'person' },
  { id: 'running', name: '运行中',    icon: 'autorenew' },
  { id: 'done',    name: '成功',      icon: 'check_circle' },
  { id: 'error',   name: '失败',      icon: 'cancel' }
];

// 后端状态: pending = 正在执行 (无队列) / done / error / aborted
const STATUS = {
  pending: { label: '执行中', icon: 'autorenew',    cls: 'running' },
  done:    { label: '成功',   icon: 'check_circle', cls: 'done' },
  error:   { label: '失败',   icon: 'cancel',       cls: 'error' },
  aborted: { label: '已终止', icon: 'block',        cls: 'error' }
};
const isOpen  = (t) => t.status === 'pending';
const isDone  = (t) => t.status === 'done';
const isError = (t) => t.status === 'error' || t.status === 'aborted';
const st = (t) => STATUS[t.status] || STATUS.pending;

// ─── computed ─────────────────────────────────────
// "我创建的" = 用户在任务页顶部手动添加的任务 (app === 'tasks' 且不是 rerun)
function isMine(t) {
  if (t.app !== 'tasks') return false;
  if (!t.meta) return true;
  const m = typeof t.meta === 'string' ? JSON.parse(t.meta) : t.meta;
  return !m?.rerunOf;
}

function applyFilter(list) {
  switch (filter.value) {
    case 'mine':    return list.filter(isMine);
    case 'running': return list.filter(isOpen);
    case 'done':    return list.filter(isDone);
    case 'error':   return list.filter(isError);
    default:        return list;
  }
}

const counts = computed(() => ({
  all:     tasks.value.length,
  mine:    tasks.value.filter(isMine).length,
  running: tasks.value.filter(isOpen).length,
  done:    tasks.value.filter(isDone).length,
  error:   tasks.value.filter(isError).length
}));

const visibleTasks = computed(() => applyFilter(tasks.value));
const openTasks    = computed(() => visibleTasks.value.filter(isOpen));
const doneTasks    = computed(() => visibleTasks.value.filter((t) => isDone(t) || isError(t)));

// ─── helpers ──────────────────────────────────────
function relTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)    return Math.round(diff) + 's 前';
  if (diff < 3600)  return Math.round(diff / 60) + ' 分前';
  if (diff < 86400) return Math.round(diff / 3600) + ' 小时前';
  return Math.round(diff / 86400) + ' 天前';
}
function preview(s, n = 80) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n) + '…' : s;
}
const setErr = (label, e) => { errMsg.value = `${label}: ${e?.body?.message || e?.message || e}`; };

// ─── 加载 ──────────────────────────────────────────
async function load() {
  loading.value = true;
  try {
    const res = await api.get('/api/task', { query: { limit: 200 } });
    tasks.value = Array.isArray(res) ? res : (res?.tasks || res?.items || []);
    if (selectedId.value) {
      const fresh = tasks.value.find((t) => t.id === selectedId.value);
      if (fresh) { detailCache.set(selectedId.value, fresh); detailFor.value = fresh; }
    }
    errMsg.value = '';
  } catch (e) { setErr('加载任务失败', e); }
  loading.value = false;
}

// 有 pending 时自动轮询
let pollTimer = null;
watch(() => tasks.value.some(isOpen), (busy) => {
  clearInterval(pollTimer); pollTimer = null;
  if (busy) pollTimer = setInterval(load, 4000);
});

// ─── 操作 ──────────────────────────────────────────
async function openDetail(t) {
  selectedId.value = t.id;
  detailFor.value = detailCache.get(t.id) || t;
  try {
    const d = await api.get('/api/task/detail', { query: { id: t.id } });
    const taskObj = d?.task || d;
    detailCache.set(t.id, taskObj);
    if (selectedId.value === t.id) detailFor.value = taskObj;
  } catch {}
}
function backToList() {
  selectedId.value = null;
  detailFor.value = null;
}

async function addTask() {
  const t = newTitle.value.trim();
  if (!t || submitting.value) return;
  submitting.value = true; errMsg.value = '';
  try {
    await api.post('/api/task/create/agent', {
      app: 'tasks', title: t.slice(0, 80), prompt: t, meta: null, wait: false
    });
    newTitle.value = '';
    await load();
  } catch (e) { setErr('创建失败', e); }
  submitting.value = false;
}

async function stopTask(t) {
  try { await api.post('/api/task/stop', { id: t.id }); await load(); }
  catch (err) { setErr('停止失败', err); }
}
async function rerun(t) {
  try {
    await api.post('/api/task/create/agent', {
      app: t.app || 'tasks',
      title: t.title || (t.prompt || '').slice(0, 80),
      prompt: t.prompt,
      meta: { rerunOf: t.id },
      wait: false
    });
    await load();
  } catch (err) { setErr('重跑失败', err); }
}

function pickFilter(id) {
  filter.value = id;
  selectedId.value = null;
  detailFor.value = null;
  if (window.innerWidth < 720) view.closeAppDrawer();
}

onMounted(load);
onActivated(load);
onDeactivated(() => { clearInterval(pollTimer); pollTimer = null; });
onBeforeUnmount(() => { clearInterval(pollTimer); pollTimer = null; });
</script>

<template>
  <div class="app-frame">

    <!-- ═══════════ 详情模式 ═══════════ -->
    <template v-if="selectedId && detailFor">
      <header class="flex h-16 flex-none items-center px-4 bg-bg max-md:h-14 max-md:px-2">
        <button class="icon-btn lg" title="返回列表" @click="backToList">
          <span class="msi">arrow_back</span>
        </button>
        <div class="ml-3 mr-1 min-w-0 flex-1 truncate text-[20px] font-medium tracking-[-0.01em] text-ink max-md:text-[17px]">
          {{ detailFor.title || (detailFor.prompt || '').slice(0, 40) || '任务详情' }}
        </div>
        <div class="ml-auto flex items-center gap-1">
          <button class="icon-btn" title="刷新" @click="openDetail(detailFor)">
            <span class="msi">refresh</span>
          </button>
          <ChatTrigger />
          <AppsTrigger />
        </div>
      </header>

      <section class="flex-1 min-w-0 min-h-0 overflow-y-auto bg-bg px-6 pb-4 max-md:px-3">
        <TaskDetail
          :task="detailFor"
          :status="st(detailFor)"
          :rel-time="relTime"
          @stop="stopTask"
          @rerun="rerun" />
      </section>
    </template>

    <!-- ═══════════ 列表模式 ═══════════ -->
    <template v-else>
      <header class="flex h-16 flex-none items-center px-4 bg-bg max-md:h-14 max-md:px-2">
        <button class="icon-btn lg" :class="{ active: view.appDrawerOpen }"
          @click="view.toggleAppDrawer()" title="侧栏">
          <span class="msi">menu</span>
        </button>
        <div class="ml-3 mr-1 min-w-0 flex-1 truncate text-[20px] font-medium tracking-[-0.01em] text-ink max-md:text-[17px]">
          任务
        </div>
        <div class="ml-auto flex items-center gap-1">
          <ChatTrigger />
          <AppsTrigger />
        </div>
      </header>

      <div class="app-body">
        <Transition name="mask">
          <div v-if="view.appDrawerOpen" class="app-side-mask" @click="view.closeAppDrawer()" />
        </Transition>

        <aside class="app-side !bg-bg" :class="{ collapsed: !view.appDrawerOpen }">
          <div class="app-side-inner">
            <Sidebar :filters="filters" :current="filter" :counts="counts" @pick="pickFilter" />
          </div>
        </aside>

        <section class="flex-1 min-w-0 min-h-0 overflow-y-auto bg-bg px-6 pb-4 max-md:px-3">
          <div class="max-w-[720px] mx-auto py-4">
            <AddBar v-model="newTitle" :submitting="submitting" @submit="addTask" />

            <div v-if="errMsg" class="my-2 px-3.5 py-2.5 rounded-[10px] bg-[#fce8e6] text-bad text-[12.5px]">
              {{ errMsg }}
            </div>

            <TaskRow v-for="t in openTasks" :key="t.id"
              :task="t"
              :status="st(t)"
              :preview="preview"
              :rel-time="relTime"
              @open="openDetail"
              @stop="stopTask"
              @rerun="rerun" />

            <template v-if="(filter === 'all' || filter === 'mine') && doneTasks.length">
              <button
                class="mt-6 mb-1 flex w-full items-center gap-2 px-3 py-2 border-0 bg-transparent rounded-lg text-left text-[14px] font-medium text-ink cursor-pointer transition-colors hover:bg-bg-hi"
                @click="showCompleted = !showCompleted">
                <span class="msi sm text-muted transition-transform"
                  :class="{ '-rotate-90': !showCompleted }">expand_more</span>
                <span>已完成 ({{ doneTasks.length }})</span>
              </button>
              <div v-if="showCompleted">
                <TaskRow v-for="t in doneTasks" :key="t.id"
                  :task="t"
                  :status="st(t)"
                  :show-status="false"
                  :preview="preview"
                  :rel-time="relTime"
                  @open="openDetail"
                  @rerun="rerun" />
              </div>
            </template>

            <template v-if="filter === 'done' || filter === 'error'">
              <TaskRow v-for="t in doneTasks" :key="t.id"
                :task="t"
                :status="st(t)"
                :preview="preview"
                :rel-time="relTime"
                @open="openDetail"
                @rerun="rerun" />
            </template>

            <div v-if="!visibleTasks.length && !loading"
              class="flex flex-col items-center justify-center gap-3 py-20 text-faint text-[13.5px]">
              <span class="msi text-faint" style="font-size:48px">task_alt</span>
              <div>{{ filter === 'all' ? '还没有任务,在上面添加一条试试' : '当前过滤条件下没有任务' }}</div>
            </div>
          </div>
        </section>
      </div>
    </template>

  </div>
</template>
