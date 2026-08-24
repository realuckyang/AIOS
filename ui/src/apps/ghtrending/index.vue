<script setup>
import { ref, reactive, onMounted } from 'vue';
import { marked } from 'marked';
import { useViewStore } from '@/stores/view.js';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';

marked.setOptions({ breaks: true, gfm: true });
const renderMd = (t) => marked.parse(t || '');

const view = useViewStore();

// ─── state ────────────────────────────────────────
const mode = ref('list');             // 'list' | 'history'
const repos = ref([]);
const loading = ref(false);
const since = ref('weekly');
const language = ref('');
const analyzingId = ref(null);
const analyses = reactive({});
const digesting = ref(false);
const digestText = ref('');
const historyItems = ref([]);

const langs = ['JavaScript', 'TypeScript', 'Python', 'Rust', 'Go', 'Java', 'C++', 'Swift', 'Kotlin'];
const timeFilters = [
  { id: 'weekly',  label: '本周' },
  { id: 'monthly', label: '本月' }
];
const langClr = (l) => ({
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572a5',
  Rust: '#dea584', Go: '#00add8', Java: '#b07219',
  'C++': '#f34b7d', Swift: '#f05138', Kotlin: '#A97BFF'
})[l] || '#8b949e';
const fmtNum = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);

// ─── API ──────────────────────────────────────────
const api = async (p, o) => (await fetch(`/apps/ghtrending/${p}`, o)).json();

const loadRepos = async () => {
  loading.value = true;
  try {
    repos.value = (await api(`list?since=${since.value}&language=${language.value}`)).repos || [];
    const ids = repos.value.map(r => r.id).filter(Boolean);
    if (ids.length) {
      const cached = (await api('check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      })).analyses || {};
      for (const [id, text] of Object.entries(cached)) analyses[id] = text;
    }
  } catch {}
  loading.value = false;
};

const analyzeRepo = async (repo) => {
  if (analyses[repo.id]) return;
  analyzingId.value = repo.id;
  try {
    analyses[repo.id] = (await api('analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo })
    })).analysis || '';
  } catch { analyses[repo.id] = '加载失败,稍后重试'; }
  analyzingId.value = null;
};

const doDigest = async () => {
  digesting.value = true;
  try {
    const list = repos.value.slice(0, 15)
      .map((r, i) => `${i + 1}. ${r.name} - ${r.description || 'N/A'} (⭐${r.stars}, ${r.language || 'N/A'})`)
      .join('\n');
    digestText.value = (await api('digest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list })
    })).analysis || '';
  } catch { digestText.value = '加载失败,稍后重试'; }
  digesting.value = false;
};

const loadHistory = async () => {
  try { historyItems.value = (await api('history')).analyses || []; } catch {}
};

// ─── 视图切换 ─────────────────────────────────────
function pickTime(id) {
  since.value = id;
  digestText.value = '';
  mode.value = 'list';
  if (window.innerWidth < 720) view.closeAppDrawer();
  loadRepos();
}
function pickLang(value) {
  language.value = value;
  mode.value = 'list';
  if (window.innerWidth < 720) view.closeAppDrawer();
  loadRepos();
}
function pickHistory() {
  mode.value = 'history';
  if (window.innerWidth < 720) view.closeAppDrawer();
  loadHistory();
}

onMounted(() => loadRepos());
</script>

<template>
  <div class="app-frame bg-[#0d1117] text-[#c9d1d9]" style="font-family: -apple-system, 'PingFang SC', sans-serif">

    <!-- ─── topbar ─── -->
    <header class="flex h-16 flex-none items-center px-4 max-md:h-14 max-md:px-2">
      <button class="icon-btn lg gh-icon-btn"
        :class="{ 'gh-icon-btn-on': view.appDrawerOpen }"
        title="侧栏"
        @click="view.toggleAppDrawer()">
        <span class="msi">menu</span>
      </button>
      <div class="ml-3 mr-1 min-w-0 flex-1 flex items-center gap-2 truncate text-[18px] font-semibold tracking-wide text-white max-md:text-[15px]">
        <svg class="h-4 w-4 shrink-0 text-white" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>
        <span class="truncate">开源热榜</span>
      </div>
      <div class="ml-auto flex items-center gap-1 dark-icons">
        <ChatTrigger />
        <AppsTrigger />
      </div>
    </header>

    <div class="app-body">
      <Transition name="mask"><div v-if="view.appDrawerOpen" class="app-side-mask" @click="view.closeAppDrawer()" /></Transition>

      <!-- ─── 侧栏 ─── -->
      <aside class="app-side !bg-[#0d1117] !border-r-[#21262d]"
        :class="{ collapsed: !view.appDrawerOpen }">
        <div class="app-side-inner">
          <nav class="flex flex-col gap-0.5 py-2">

            <button class="gh-nav-item mt-2"
              :class="{ 'gh-nav-active': mode === 'history' }"
              @click="pickHistory">
              <span class="msi sm">history</span>
              <span class="flex-1 truncate text-left">已分析</span>
              <span v-if="historyItems.length" class="rounded-full bg-[#21262d] px-2 py-px text-[10.5px] tabular-nums text-[#8b949e]">{{ historyItems.length }}</span>
            </button>

            <div class="px-4 pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#6e7681]">语言</div>
            <button class="gh-nav-item"
              :class="{ 'gh-nav-active': mode === 'list' && language === '' }"
              @click="pickLang('')">
              <span class="msi sm">all_inclusive</span>
              <span class="flex-1 truncate text-left">全部语言</span>
            </button>
            <button v-for="l in langs" :key="l"
              class="gh-nav-item"
              :class="{ 'gh-nav-active': mode === 'list' && language === l }"
              @click="pickLang(l)">
              <span class="lang-dot" :style="{ background: langClr(l) }"></span>
              <span class="flex-1 truncate text-left">{{ l }}</span>
            </button>
          </nav>
        </div>
      </aside>

      <!-- ─── main ─── -->
      <section class="flex-1 min-w-0 min-h-0 overflow-y-auto">

        <!-- 列表视图 -->
        <div v-if="mode === 'list'" class="px-4 py-4 max-w-[820px] mx-auto">

          <!-- 顶部时间筛选 -->
          <div class="mb-3 flex shrink-0 rounded-lg border border-[#30363d] bg-[#161b22] p-0.5 shadow-sm w-fit">
            <button v-for="t in timeFilters" :key="t.id"
              class="rounded-md px-4 py-1.5 text-[12px] font-medium transition-all"
              :class="since === t.id
                ? 'bg-[#21262d] text-[#c9d1d9] shadow-sm ring-1 ring-white/10'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'"
              @click="pickTime(t.id)">
              {{ t.label }}
            </button>
          </div>

          <div v-if="loading" class="text-center text-[#484f58] text-sm py-16">加载中…</div>

          <template v-else>
            <!-- Digest banner -->
            <div class="mb-3">
              <div v-if="!digestText"
                class="flex items-center justify-between gap-3 rounded-xl border border-[#388bfd]/20 bg-[#388bfd]/10 p-4">
                <div class="min-w-0">
                  <div class="text-[13px] font-bold text-[#58a6ff] mb-1">本周热榜总览</div>
                  <div class="text-[11px] text-[#58a6ff]/70">AI 阅读全部仓库后给出主题与代表项目的中文总结</div>
                </div>
                <button @click="doDigest" :disabled="digesting"
                  class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#238636] px-4 py-2 text-[12px] font-medium text-white transition-all hover:bg-[#2ea043] active:scale-95 disabled:opacity-40">
                  <svg v-if="digesting" class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span v-else>✦</span>
                  {{ digesting ? '总览生成中…' : '总览' }}
                </button>
              </div>
              <div v-else class="rounded-xl border border-[#21262d] bg-[#161b22] p-5 text-xs leading-relaxed text-[#8b949e]">
                <div class="mb-4 flex items-center justify-between border-b border-[#21262d] pb-3">
                  <span class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#58a6ff]">
                    <span class="text-[14px]">✦</span> 总览
                  </span>
                  <button @click="digestText = ''" class="text-[12px] text-[#484f58] transition-colors hover:text-[#c9d1d9]">✕</button>
                </div>
                <div class="prose prose-sm prose-invert max-w-none text-[#8b949e]" v-html="renderMd(digestText)"></div>
              </div>
            </div>

            <!-- Repo cards -->
            <div class="space-y-3">
              <div v-for="repo in repos" :key="repo.id"
                class="rounded-xl border border-[#21262d] bg-[#161b22] p-4 transition-colors hover:border-[#30363d]">
                <div class="flex items-start gap-3">
                  <img :src="repo.avatar" class="mt-0.5 h-8 w-8 shrink-0 rounded-full" />
                  <div class="flex-1 min-w-0">
                    <a :href="repo.url" target="_blank"
                      class="mb-1 block truncate text-sm font-semibold text-[#58a6ff] hover:underline">{{ repo.name }}</a>
                    <p v-if="repo.description" class="mb-3 text-xs leading-relaxed text-[#8b949e]">{{ repo.description }}</p>
                    <div class="flex items-center gap-4 text-[11px] text-[#484f58]">
                      <span v-if="repo.language" class="flex items-center gap-1">
                        <span class="h-2.5 w-2.5 rounded-full" :style="{ background: langClr(repo.language) }"></span>
                        {{ repo.language }}
                      </span>
                      <span>⭐ {{ fmtNum(repo.stars) }}</span>
                      <span>🍴 {{ fmtNum(repo.forks) }}</span>
                    </div>
                  </div>
                  <button @click="analyzeRepo(repo)" :disabled="analyzingId === repo.id || analyses[repo.id]"
                    class="shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all disabled:opacity-40"
                    :class="analyses[repo.id] ? 'bg-[#238636]/15 text-[#3fb950]' : 'bg-[#21262d] text-[#8b949e] hover:bg-[#388bfd]/10 hover:text-[#58a6ff]'">
                    {{ analyses[repo.id] ? '✦ 已分析' : '✦ 深读' }}
                  </button>
                </div>
                <div v-if="analyzingId === repo.id && !analyses[repo.id]"
                  class="mt-4 flex items-center gap-2 border-t border-[#21262d] pt-4 text-xs text-[#8b949e]">
                  <svg class="h-4 w-4 animate-spin text-[#58a6ff]" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span class="animate-pulse">AI 正在阅读 README 与关键文件…</span>
                </div>
                <div v-else-if="analyses[repo.id]"
                  class="mt-3 border-t border-[#21262d] pt-3 text-xs leading-relaxed text-[#8b949e]"
                  v-html="renderMd(analyses[repo.id])"></div>
              </div>
            </div>
          </template>
        </div>

        <!-- 历史视图 -->
        <div v-else class="px-4 py-4 max-w-[820px] mx-auto">
          <div v-if="!historyItems.length" class="text-center text-[#484f58] text-sm py-16">还没有分析过的项目</div>
          <div v-else class="space-y-3">
            <div v-for="item in historyItems" :key="item.id"
              class="rounded-xl border border-[#21262d] bg-[#161b22] p-4">
              <div class="mb-3 flex items-start gap-3">
                <img :src="item.repo_avatar" class="mt-0.5 h-7 w-7 shrink-0 rounded-full" />
                <div class="flex-1 min-w-0">
                  <a :href="item.repo_url" target="_blank"
                    class="text-sm font-semibold text-[#58a6ff] hover:underline">{{ item.repo_name }}</a>
                  <div class="mt-0.5 flex items-center gap-3 text-[11px] text-[#484f58]">
                    <span v-if="item.repo_language" class="flex items-center gap-1">
                      <span class="h-2 w-2 rounded-full" :style="{ background: langClr(item.repo_language) }"></span>
                      {{ item.repo_language }}
                    </span>
                    <span>⭐ {{ fmtNum(item.repo_stars) }}</span>
                    <span class="text-[#30363d]">{{ item.created_at?.slice(0, 10) }}</span>
                  </div>
                </div>
              </div>
              <div class="text-xs leading-relaxed text-[#8b949e]" v-html="renderMd(item.analysis)"></div>
            </div>
          </div>
        </div>

      </section>
    </div>
  </div>
</template>

<style scoped>
/* topbar / 暗主题 .icon-btn 改色 */
.gh-icon-btn { color: #c9d1d9; }
.gh-icon-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
.gh-icon-btn-on { background: rgba(255,255,255,0.08); color: #fff; }
.dark-icons :deep(.icon-btn) { color: #c9d1d9; }
.dark-icons :deep(.icon-btn:hover) { background: rgba(255,255,255,0.08); color: #fff; }
.dark-icons :deep(.icon-btn.active) { background: rgba(88,166,255,0.16); color: #58a6ff; }

/* 侧栏 nav */
.gh-nav-item {
  display: flex; align-items: center; gap: 14px;
  width: 100%;
  padding: 0 16px;
  height: 38px;
  border: 0; background: transparent;
  border-radius: 0 20px 20px 0;
  color: #c9d1d9;
  font-size: 13px;
  cursor: pointer;
  transition: background .12s, color .12s;
}
.gh-nav-item .msi { color: #8b949e; flex: none; }
.gh-nav-item:hover { background: rgba(255,255,255,0.05); }
.gh-nav-active { background: rgba(88,166,255,0.16) !important; color: #58a6ff !important; }
.gh-nav-active .msi { color: #58a6ff; }
.lang-dot {
  flex: none; width: 12px; height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.1);
}
</style>
