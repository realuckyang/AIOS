<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    ArrowLeft, ChevronRight, Hourglass, LayoutGrid, Lightbulb, Loader2,
    Minus, Package, Plus, RotateCcw, Sparkles, Trash2, X,
} from 'lucide-vue-next';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';

const route = useRoute();
const router = useRouter();

// 视图三态:list / project / plan
const view = computed(() => {
    if (route.params.p2) return 'plan';
    if (route.params.p1) return 'project';
    return 'list';
});
const routeProjectId = computed(() => Number(route.params.p1) || null);
const routePlanId = computed(() => Number(route.params.p2) || null);

const goList = () => router.push('/app/workshop');
const goProject = (id) => router.push(`/app/workshop/${id}`);
const goPlan = (projectId, planId) => router.push(`/app/workshop/${projectId}/${planId}`);

const api = async (path, options = {}) => {
    const res = await fetch(`/apps/workshop${path}`, {
        ...options,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
    return data;
};

// === ideas (灵感库) ===
const ideas = ref([]);
const ideasOpen = ref(false);
const fetchIdeas = async () => {
    try {
        const data = await api('/ideas');
        ideas.value = Array.isArray(data.items) ? data.items : [];
    } catch { /* 静默 */ }
};
const useIdea = (idea) => {
    topic.value = idea.prompt || idea.summary || idea.title;
    ideasOpen.value = false;
};

// === list state ===
const projects = ref([]);
const loadingList = ref(false);
const error = ref('');

const fetchList = async () => {
    loadingList.value = true;
    error.value = '';
    try {
        const data = await api('/project/list');
        projects.value = data.items || [];
    } catch (e) { error.value = e.message; }
    finally { loadingList.value = false; }
};

// === composer ===
const topic = ref('');
const count = ref(3);
const creating = ref(false);
const composing = ref(false);

const createProject = async () => {
    const t = topic.value.trim();
    const n = Math.max(1, Math.min(6, Number(count.value) || 3));
    if (!t || creating.value) return;
    creating.value = true;
    error.value = '';
    try {
        const data = await api('/project/create', {
            method: 'POST',
            body: JSON.stringify({ topic: t, count: n }),
        });
        topic.value = '';
        if (data.project?.id) goProject(data.project.id);
        else await fetchList();
    } catch (e) { error.value = e.message; }
    finally { creating.value = false; }
};

const onTopicKey = (e) => {
    if (composing.value || e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); createProject(); }
};

const removeProject = async (id, e) => {
    e?.stopPropagation();
    if (!confirm(`删除这个项目?`)) return;
    try {
        await api('/project/delete', { method: 'POST', body: JSON.stringify({ id }) });
        projects.value = projects.value.filter(p => p.id !== id);
    } catch (e) { error.value = e.message; }
};

// === project detail ===
const project = ref(null);
const plans = ref([]);
const loadingProject = ref(false);

const fetchProject = async (id) => {
    if (!id) return;
    try {
        const data = await api(`/project/get?id=${id}`);
        project.value = data.project || null;
        plans.value = data.plans || [];
    } catch (e) { error.value = e.message; }
};

const loadProject = async (id) => {
    loadingProject.value = true;
    project.value = null;
    plans.value = [];
    try { await fetchProject(id); }
    finally { loadingProject.value = false; }
};

const hasActive = computed(() => plans.value.some(p => {
    const s = p.latestTask?.status;
    return s === 'pending' || s === 'running';
}));

let pollTimer = null;
const stopPoll = () => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } };
const startPoll = () => {
    stopPoll();
    pollTimer = setInterval(() => {
        if (view.value !== 'project' || !routeProjectId.value) { stopPoll(); return; }
        if (!hasActive.value) { stopPoll(); return; }
        fetchProject(routeProjectId.value);
    }, 2500);
};

const regenerate = async (planId, e) => {
    e?.stopPropagation();
    try {
        await api('/plan/regenerate', { method: 'POST', body: JSON.stringify({ planId }) });
        await fetchProject(routeProjectId.value);
        startPoll();
    } catch (e) { error.value = e.message; }
};

// === plan detail (iframe) ===
const planHtml = ref('');
const planMeta = ref(null);
const planLoading = ref(false);

const loadPlanResult = async (planId) => {
    planLoading.value = true;
    planHtml.value = '';
    planMeta.value = null;
    try {
        const data = await api(`/result/get?planId=${planId}`);
        planHtml.value = data.html || '';
        planMeta.value = {
            title: data.plan?.title,
            description: data.plan?.description,
            projectId: data.plan?.projectId,
        };
    } catch (e) { error.value = e.message; }
    finally { planLoading.value = false; }
};

// === lifecycle ===
onMounted(() => { fetchList(); fetchIdeas(); });
onUnmounted(stopPoll);

watch([view, routeProjectId, routePlanId], async ([v, pid, planId]) => {
    error.value = '';
    if (v === 'list') {
        stopPoll();
        await fetchList();
    } else if (v === 'project' && pid) {
        stopPoll();
        await loadProject(pid);
        if (hasActive.value) startPoll();
    } else if (v === 'plan' && planId) {
        stopPoll();
        await loadPlanResult(planId);
    }
}, { immediate: true });

const statusLabel = (s) => ({
    pending: '排队中',
    running: '生成中',
    done: '已完成',
    failed: '失败',
}[s] || s || '未知');

const statusClass = (s) => `chip chip-${s || 'unknown'}`;

</script>

<template>
  <div class="app-frame">
    <header class="topbar">
      <button v-if="view !== 'list'" class="icon-btn lg" @click="view === 'plan' ? goProject(planMeta?.projectId || routeProjectId) : goList()" title="返回">
        <span class="msi">arrow_back</span>
      </button>
      <div class="brand">
        <span class="name">{{
          view === 'list' ? '应用工坊'
          : view === 'project' ? (project?.topic || '加载中…')
          : (planMeta?.title || '加载中…')
        }}</span>
        <span v-if="view === 'plan' && planMeta?.description" class="sub">{{ planMeta.description }}</span>
      </div>
      <div class="right">
        <ChatTrigger />
        <AppsTrigger />
      </div>
    </header>

    <section class="pane">

      <!-- ============== PLAN (iframe 预览) ============== -->
      <template v-if="view === 'plan'">
        <div v-if="planLoading" class="state-empty">
          <Hourglass :size="30" :stroke-width="1.6" />
          <div>加载中…</div>
        </div>
        <iframe v-else class="plan-frame"
          :srcdoc="planHtml"
          sandbox="allow-scripts allow-forms allow-modals allow-popups"
          referrerpolicy="no-referrer"
          :title="planMeta?.title || 'workshop'"></iframe>
      </template>

      <!-- ============== PROJECT DETAIL (plans 网格) ============== -->
      <template v-else-if="view === 'project'">
        <div class="content-scroll">
          <div v-if="error" class="err">{{ error }}</div>

          <div v-if="loadingProject && !plans.length" class="state-empty">
            <Hourglass :size="30" :stroke-width="1.6" />
            <div>加载中…</div>
          </div>

          <div v-else class="plans-grid">
            <div v-for="p in plans" :key="p.id"
              class="plan-card"
              :class="{ clickable: p.hasResult }"
              @click="p.hasResult && goPlan(project.id, p.id)">
              <div class="plan-head">
                <div class="plan-title-wrap">
                  <div class="plan-title">{{ p.title }}</div>
                  <div v-if="p.description" class="plan-desc">{{ p.description }}</div>
                </div>
                <span class="status-chip" :class="`s-${p.latestTask?.status || 'unknown'}`">
                  <Loader2 v-if="p.latestTask?.status === 'running'" :size="11" :stroke-width="1.9" class="spin" />
                  {{ statusLabel(p.latestTask?.status) }}
                </span>
              </div>
              <div v-if="p.latestTask?.status === 'failed' && p.latestTask?.error" class="plan-err">
                {{ p.latestTask.error }}
              </div>
              <div class="plan-foot">
                <span class="slug">{{ p.slug }}</span>
                <button v-if="p.latestTask?.status === 'failed' || p.hasResult"
                  class="mini-btn" @click="regenerate(p.id, $event)" title="再生成">
                  <RotateCcw :size="13" :stroke-width="1.8" />
                  <span>再生成</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ============== LIST (composer + 项目列表) ============== -->
      <template v-else>
        <div class="content-scroll">

          <!-- composer card -->
          <div class="composer-card">
            <textarea v-model="topic"
              @keydown="onTopicKey"
              @compositionstart="composing = true"
              @compositionend="composing = false"
              rows="2"
              placeholder="描述要做的样稿主题,例如:购物车页面 / 项目看板 / 个人主页"
              class="composer-input" />
            <div class="composer-toolbar">
              <div class="count-pill">
                <button class="count-btn" :disabled="count <= 1 || creating"
                  @click="count = Math.max(1, (Number(count) || 1) - 1)">
                  <Minus :size="14" :stroke-width="1.8" />
                </button>
                <span class="count-num">{{ count }}</span>
                <button class="count-btn" :disabled="count >= 6 || creating"
                  @click="count = Math.min(6, (Number(count) || 1) + 1)">
                  <Plus :size="14" :stroke-width="1.8" />
                </button>
              </div>
              <button class="ideas-btn" @click="ideasOpen = !ideasOpen"
                :class="{ on: ideasOpen }" title="灵感库">
                <Lightbulb :size="14" :stroke-width="1.8" />
                <span>灵感</span>
                <span class="ideas-count">{{ ideas.length }}</span>
              </button>
              <button class="create-btn"
                :disabled="creating || !topic.trim()"
                @click="createProject">
                <Loader2 v-if="creating" :size="15" :stroke-width="1.9" class="spin" />
                <Sparkles v-else :size="15" :stroke-width="1.9" />
                <span>{{ creating ? '规划中…' : '创建项目' }}</span>
              </button>
            </div>
          </div>

          <!-- ideas drawer -->
          <transition name="ideas">
            <div v-if="ideasOpen" class="ideas-drawer">
              <div class="ideas-head">
                <Lightbulb :size="14" :stroke-width="1.8" />
                <span class="ideas-title">灵感库</span>
                <span class="ideas-hint">点一个把它当起点</span>
                <button class="x-btn" @click="ideasOpen = false">
                  <X :size="14" :stroke-width="1.8" />
                </button>
              </div>
              <div class="ideas-grid">
                <button v-for="idea in ideas" :key="idea.id" class="idea-tile"
                  @click="useIdea(idea)">
                  <span class="idea-icon">
                    <Sparkles :size="16" :stroke-width="1.7" />
                  </span>
                  <span class="idea-meta">
                    <span class="idea-title-row">
                      <span class="idea-title">{{ idea.title }}</span>
                      <span class="idea-cat">{{ idea.category }}</span>
                    </span>
                    <span class="idea-summary">{{ idea.summary }}</span>
                  </span>
                </button>
              </div>
            </div>
          </transition>

          <div v-if="error" class="err">{{ error }}</div>

          <!-- empty / loading / list -->
          <div v-if="loadingList && !projects.length" class="state-empty">
            <Hourglass :size="30" :stroke-width="1.6" />
            <div>加载中…</div>
          </div>

          <div v-else-if="!projects.length" class="state-empty">
            <Package :size="32" :stroke-width="1.5" />
            <div>还没有项目,在上面输入个主题让 AI 起步</div>
          </div>

          <div v-else class="proj-list">
            <div v-for="p in projects" :key="p.id" class="proj-row" @click="goProject(p.id)">
              <span class="proj-icon">
                <LayoutGrid :size="20" :stroke-width="1.7" />
              </span>
              <div class="proj-meta">
                <div class="proj-title">{{ p.topic }}</div>
                <div class="proj-stats">
                  <span class="stat-faint">{{ p.counts?.plans || 0 }} 个方向</span>
                  <span v-if="p.counts?.running" class="stat-chip s-running">
                    <Loader2 :size="11" :stroke-width="1.8" class="spin" />
                    {{ p.counts.running }} 生成中
                  </span>
                  <span v-if="p.counts?.pending" class="stat-chip s-pending">
                    {{ p.counts.pending }} 排队
                  </span>
                  <span v-if="p.counts?.done" class="stat-chip s-done">
                    {{ p.counts.done }} 完成
                  </span>
                  <span v-if="p.counts?.failed" class="stat-chip s-failed">
                    {{ p.counts.failed }} 失败
                  </span>
                </div>
              </div>
              <button class="trash-btn" @click="removeProject(p.id, $event)" title="删除">
                <Trash2 :size="16" :stroke-width="1.7" />
              </button>
              <ChevronRight :size="18" :stroke-width="1.6" class="chevron" />
            </div>
          </div>

        </div>
      </template>

    </section>
  </div>
</template>

<style scoped>
.app-frame { flex: 1; min-height: 0; min-width: 0; display: flex; flex-direction: column; background: var(--bg); }

/* topbar */
.topbar { flex: none; height: 64px; display: flex; align-items: center; padding: 8px 16px; background: var(--bg); }
.topbar .brand { flex: 1; min-width: 0; display: flex; flex-direction: column; margin: 0 4px 0 12px; }
.topbar .brand .name { font-size: 20px; font-weight: 500; letter-spacing: -0.01em; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.topbar .brand .sub { font-size: 12px; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
.topbar .right { display: flex; align-items: center; gap: 4px; margin-left: auto; }

/* 内容白卡 (跟 chat / files 同样的 pane 模式) */
.pane {
  flex: 1; min-height: 0; min-width: 0;
  display: flex; flex-direction: column;
  background: #fff;
  border-radius: 16px;
  margin: 0 8px 8px 8px;
  overflow: hidden;
  position: relative;
}
.content-scroll {
  flex: 1; min-height: 0; min-width: 0;
  overflow: auto;
  padding: 24px 32px 32px;
}
.content-scroll > * + * { margin-top: 14px; }
@media (max-width: 720px) {
  .pane { margin: 4px; border-radius: 12px; }
  .content-scroll { padding: 16px 14px 24px; }
}

/* composer */
.composer-card {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 12px;
  box-shadow: var(--shadow-1);
}
.composer-input {
  width: 100%;
  resize: none;
  border: 0; outline: 0;
  background: var(--bg-elev);
  border-radius: 14px;
  padding: 10px 14px;
  font: inherit; font-size: 14px;
  color: var(--text);
  line-height: 1.55;
  transition: background .12s, box-shadow .12s;
}
.composer-input::placeholder { color: var(--text-3); }
.composer-input:focus { background: #fff; box-shadow: 0 0 0 2px var(--accent-soft); }

.composer-toolbar { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.count-pill {
  display: inline-flex; align-items: center;
  height: 36px; padding: 0 4px;
  background: var(--bg-elev); border-radius: 18px;
}
.count-btn {
  width: 28px; height: 28px;
  display: grid; place-items: center;
  border: 0; background: transparent;
  border-radius: 50%;
  color: var(--text-2);
  cursor: pointer;
  transition: background .12s, color .12s;
}
.count-btn:hover:not(:disabled) { background: rgba(60,64,67,0.08); color: var(--text); }
.count-btn:disabled { opacity: .35; cursor: default; }
.count-num {
  width: 28px; text-align: center;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 13px; font-weight: 600;
  color: var(--text);
}

.ideas-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 14px;
  border: 0; background: var(--bg-elev);
  border-radius: 18px;
  color: var(--text-2);
  font-size: 13px; font-weight: 500;
  cursor: pointer;
  transition: background .12s, color .12s;
}
.ideas-btn:hover { background: rgba(60,64,67,0.08); color: var(--text); }
.ideas-btn.on { background: var(--accent-soft); color: var(--accent-fg); }
.ideas-count { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; color: var(--text-3); }
.ideas-btn.on .ideas-count { color: var(--accent-fg); }

.create-btn {
  margin-left: auto;
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 18px;
  border: 0;
  background: var(--accent); color: #fff;
  border-radius: 18px;
  font-size: 13.5px; font-weight: 500;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(26,115,232,0.3);
  transition: background .12s, box-shadow .12s, opacity .12s;
}
.create-btn:hover:not(:disabled) { background: var(--accent-hi); box-shadow: 0 1px 2px rgba(26,115,232,0.4), 0 4px 12px rgba(26,115,232,0.18); }
.create-btn:disabled { opacity: .4; cursor: default; box-shadow: none; }

/* ideas drawer */
.ideas-drawer {
  background: var(--bg-elev);
  border-radius: 18px;
  padding: 14px 16px;
}
.ideas-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; color: var(--accent); }
.ideas-title { font-size: 13px; font-weight: 600; color: var(--text); }
.ideas-hint { font-size: 11.5px; color: var(--text-3); }
.x-btn {
  margin-left: auto;
  width: 28px; height: 28px;
  display: grid; place-items: center;
  border: 0; background: transparent;
  border-radius: 50%;
  color: var(--text-3); cursor: pointer;
  transition: background .12s, color .12s;
}
.x-btn:hover { background: rgba(60,64,67,0.08); color: var(--text); }

.ideas-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
@media (max-width: 720px) { .ideas-grid { grid-template-columns: 1fr; } }
.idea-tile {
  display: flex; align-items: flex-start; gap: 10px;
  border: 0; background: #fff;
  border-radius: 14px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  transition: background .12s, box-shadow .12s;
}
.idea-tile:hover { background: var(--bg); box-shadow: var(--shadow-1); }
.idea-icon {
  flex: none;
  width: 36px; height: 36px;
  display: grid; place-items: center;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--accent-fg);
}
.idea-meta { flex: 1; min-width: 0; }
.idea-title-row { display: flex; align-items: baseline; gap: 6px; }
.idea-title { font-size: 13.5px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.idea-cat {
  flex: none;
  font-size: 10px; color: var(--text-3);
  border: 1px solid var(--line);
  padding: 1px 6px;
  border-radius: 4px;
}
.idea-summary {
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  margin-top: 4px;
  font-size: 12px; line-height: 1.5;
  color: var(--text-2);
}

/* error / empty */
.err {
  background: color-mix(in srgb, var(--bad) 12%, transparent);
  color: var(--bad);
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
}
.state-empty {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 80px 20px;
  color: var(--text-2);
  font-size: 13.5px;
  text-align: center;
}
.state-empty :first-child { color: var(--text-3); }

/* 项目列表 */
.proj-list { display: flex; flex-direction: column; gap: 8px; }
.proj-row {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  cursor: pointer;
  transition: background .12s, border-color .12s, transform .12s;
}
.proj-row:hover { background: var(--bg); border-color: var(--line-hi); transform: translateY(-1px); box-shadow: var(--shadow-1); }
.proj-icon {
  flex: none;
  width: 44px; height: 44px;
  display: grid; place-items: center;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--accent-fg);
}
.proj-meta { flex: 1; min-width: 0; }
.proj-title {
  font-size: 15px; font-weight: 600;
  color: var(--text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.proj-stats { margin-top: 4px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 11.5px; }
.stat-faint { color: var(--text-3); }
.stat-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 500;
}
.stat-chip.s-running { color: var(--accent); border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent); }
.stat-chip.s-pending { color: var(--text-2); background: var(--bg-elev); }
.stat-chip.s-done { color: var(--good); border: 1px solid color-mix(in srgb, var(--good) 30%, transparent); }
.stat-chip.s-failed { color: var(--bad); border: 1px solid color-mix(in srgb, var(--bad) 30%, transparent); }

.trash-btn {
  flex: none;
  width: 36px; height: 36px;
  display: grid; place-items: center;
  border: 0; background: transparent;
  border-radius: 50%;
  color: var(--text-3);
  cursor: pointer;
  opacity: 0;
  transition: opacity .12s, background .12s, color .12s;
}
.proj-row:hover .trash-btn { opacity: 1; }
.trash-btn:hover { background: color-mix(in srgb, var(--bad) 10%, transparent); color: var(--bad); }
.chevron { color: var(--text-3); }

/* plan 网格 */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
.plan-card {
  display: flex; flex-direction: column; gap: 8px;
  padding: 16px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  transition: background .12s, border-color .12s, transform .12s, box-shadow .12s;
}
.plan-card.clickable { cursor: pointer; }
.plan-card.clickable:hover { background: var(--bg); border-color: var(--line-hi); transform: translateY(-2px); box-shadow: var(--shadow-1); }
.plan-head { display: flex; align-items: flex-start; gap: 10px; }
.plan-title-wrap { flex: 1; min-width: 0; }
.plan-title { font-size: 14.5px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.plan-desc {
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  margin-top: 4px;
  font-size: 12.5px; line-height: 1.5;
  color: var(--text-2);
}
.status-chip {
  flex: none;
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 500;
  padding: 2px 9px;
  border-radius: 999px;
}
.status-chip.s-running { color: var(--accent); border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent); }
.status-chip.s-pending { color: var(--text-2); background: var(--bg-elev); }
.status-chip.s-done { color: var(--good); border: 1px solid color-mix(in srgb, var(--good) 30%, transparent); }
.status-chip.s-failed { color: var(--bad); border: 1px solid color-mix(in srgb, var(--bad) 30%, transparent); }

.plan-err {
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  font-size: 11.5px; color: var(--bad);
}
.plan-foot { margin-top: auto; display: flex; align-items: center; gap: 8px; padding-top: 4px; }
.slug { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; color: var(--text-3); }
.mini-btn {
  margin-left: auto;
  display: inline-flex; align-items: center; gap: 4px;
  height: 28px; padding: 0 10px;
  border: 0; background: var(--bg-elev);
  border-radius: 14px;
  color: var(--text-2);
  font-size: 11.5px; font-weight: 500;
  cursor: pointer;
  transition: background .12s, color .12s;
}
.mini-btn:hover { background: var(--accent-soft); color: var(--accent-fg); }

/* plan iframe */
.plan-frame {
  flex: 1; min-height: 0; min-width: 0;
  width: 100%;
  border: 0;
  background: var(--bg);
}

@media (max-width: 720px) {
  .topbar { padding: 8px; height: 56px; }
  .topbar .brand .name { font-size: 17px; }
}

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.ideas-enter-active, .ideas-leave-active { transition: opacity .18s, transform .18s; }
.ideas-enter-from, .ideas-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
