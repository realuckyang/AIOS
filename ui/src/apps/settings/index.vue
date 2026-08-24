<script setup>
import { computed, onActivated, onMounted, ref, watch } from 'vue';
import * as api from '@/utils/api.js';
import { useAuthStore } from '@/stores/auth.js';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';

const auth = useAuthStore();

// ───────── 全局状态 ─────────
const settings = ref(null);
const prompt = ref('');
const providerGroups = ref([]);
const providers = ref([]);
const contextItems = ref([]);
const sysSnap = ref(null);

const loading = ref(true);
const errMsg = ref('');
const notice = ref({ kind: '', text: '' });
let noticeTimer = null;
function flash(kind, text) {
  notice.value = { kind, text };
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => notice.value = { kind: '', text: '' }, 2200);
}

const sections = [
  { key: 'account',  label: '账户',     icon: 'person' },
  { key: 'model',    label: '模型',     icon: 'smart_toy' },
  { key: 'prompt',   label: '提示词',   icon: 'edit_note' },
  { key: 'context',  label: '上下文',   icon: 'history' },
  { key: 'sources',  label: '上下文资源', icon: 'inventory_2' },
  { key: 'tools',    label: '工具调用', icon: 'handyman' },
  { key: 'about',    label: '关于',     icon: 'info' }
];
const active = ref('account');
const activeSection = computed(() => sections.find((s) => s.key === active.value));

// ───────── 模型 / Provider ─────────
const PROVIDER_CACHE_KEY = 'aios.gui2.providerConfigs.v1';
const providerCache = ref({});
function loadProviderCache() {
  try { providerCache.value = JSON.parse(localStorage.getItem(PROVIDER_CACHE_KEY) || '{}'); }
  catch { providerCache.value = {}; }
}
function saveProviderCache() { localStorage.setItem(PROVIDER_CACHE_KEY, JSON.stringify(providerCache.value)); }
function providersByGroup(gid) { return providers.value.filter((p) => p.group === gid); }
function getProvider(id) { return providers.value.find((p) => p.id === id) || null; }
const currentProviderMeta = computed(() => getProvider(settings.value?.provider));

function onProviderChange(nextId) {
  if (!settings.value) return;
  // 缓存当前
  providerCache.value[settings.value.provider] = {
    apiUrl: settings.value.apiUrl, apiKey: settings.value.apiKey, model: settings.value.model
  };
  saveProviderCache();
  settings.value.provider = nextId;
  const cached = providerCache.value[nextId];
  if (cached) {
    settings.value.apiUrl = cached.apiUrl || '';
    settings.value.apiKey = cached.apiKey || '';
    settings.value.model  = cached.model  || '';
  } else {
    const meta = getProvider(nextId);
    settings.value.apiUrl = meta?.apiUrl || '';
    settings.value.apiKey = '';
    settings.value.model  = meta?.defaultModel || '';
  }
}

// ───────── 加载 ─────────
async function loadAll() {
  loading.value = true; errMsg.value = '';
  try {
    const [s, p, prov] = await Promise.all([
      api.get('/api/settings'),
      api.get('/api/settings/prompt').catch(() => ({ content: '' })),
      api.get('/api/llm/providers').catch(() => ({ groups: [], providers: [] }))
    ]);
    settings.value = s;
    prompt.value = p?.content || '';
    providerGroups.value = prov.groups || [];
    providers.value = prov.providers || [];
    providerCache.value[s.provider] ??= { apiUrl: s.apiUrl, apiKey: s.apiKey, model: s.model };
    saveProviderCache();
  } catch (e) { errMsg.value = '加载失败: ' + (e.message || e); }
  loading.value = false;
}

async function loadContexts() {
  try {
    const data = await api.get('/api/settings/contexts');
    contextItems.value = data?.items || [];
  } catch (e) { errMsg.value = '加载上下文资源失败: ' + (e.message || e); }
}

async function loadSys() {
  try { sysSnap.value = await api.get('/apps/sysinfo/snapshot'); } catch {}
}

// ───────── 保存动作 ─────────
async function saveModel() {
  try {
    const next = await api.post('/api/settings', {
      provider: settings.value.provider,
      apiUrl:   settings.value.apiUrl,
      apiKey:   settings.value.apiKey,
      model:    settings.value.model
    });
    settings.value = { ...settings.value, ...next };
    providerCache.value[next.provider] = { apiUrl: next.apiUrl, apiKey: next.apiKey, model: next.model };
    saveProviderCache();
    flash('ok', '模型设置已保存');
  } catch (e) { flash('err', '保存失败: ' + (e?.body?.message || e.message || e)); }
}
async function savePrompt() {
  try {
    await api.post('/api/settings/prompt', { content: prompt.value });
    flash('ok', '提示词已保存');
  } catch (e) { flash('err', '保存失败: ' + (e?.body?.message || e.message || e)); }
}
async function saveContext() {
  try {
    const next = await api.post('/api/settings', { contextRounds: settings.value.contextRounds });
    settings.value = { ...settings.value, ...next };
    flash('ok', '已保存');
  } catch (e) { flash('err', '保存失败: ' + (e.message || e)); }
}
async function saveTools() {
  try {
    const maxChars = Math.max(1000, Math.min(50000, Number(settings.value.toolResultMaxChars) || 12000));
    const maxRounds = Math.max(1, Math.min(500, Number(settings.value.toolMaxRounds) || 50));
    const next = await api.post('/api/settings', {
      enableToolResultTruncate: settings.value.enableToolResultTruncate ? '1' : '0',
      toolResultMaxChars: maxChars,
      enableToolLoopLimit: settings.value.enableToolLoopLimit ? '1' : '0',
      toolMaxRounds: maxRounds
    });
    settings.value = { ...settings.value, ...next };
    flash('ok', '工具设置已保存');
  } catch (e) { flash('err', '保存失败: ' + (e.message || e)); }
}

// ───────── 修改密码 ─────────
const pwd = ref({ old: '', n1: '', n2: '' });
const pwdNotice = ref({ kind: '', text: '' });
const canChangePwd = computed(() => pwd.value.old && pwd.value.n1.length >= 6 && pwd.value.n1 === pwd.value.n2);
async function changePwd() {
  pwdNotice.value = { kind: '', text: '' };
  if (!canChangePwd.value) {
    pwdNotice.value = { kind: 'err', text: '请检查输入(新密码至少 6 位且两次一致)' };
    return;
  }
  try {
    await api.post('/api/auth/change-password', { oldPassword: pwd.value.old, newPassword: pwd.value.n1 });
    pwdNotice.value = { kind: 'ok', text: '密码已更新' };
    pwd.value = { old: '', n1: '', n2: '' };
  } catch (e) { pwdNotice.value = { kind: 'err', text: e?.body?.message || e.message || '更新失败' }; }
}

// ───────── 上下文资源 access 文案 ─────────
function accessLabel(a) {
  if (a === 'full') return '完整';
  if (a === 'summary') return '摘要';
  return '不读取';
}
function accessClass(a) {
  if (a === 'full') return 'pill-blue';
  if (a === 'summary') return 'pill-soft';
  return 'pill-mute';
}

// ───────── 切换 section 时按需加载 ─────────
watch(active, (k) => {
  if (k === 'sources' && !contextItems.value.length) loadContexts();
  if (k === 'about' && !sysSnap.value) loadSys();
});

onMounted(() => { loadProviderCache(); loadAll(); });
onActivated(() => loadAll());
</script>

<template>
  <div class="app-frame">
    <header class="topbar">
      <span class="left-spacer"></span>
      <div class="brand"><span class="name">设置</span></div>
      <div class="right">
        <ChatTrigger />
        <AppsTrigger />
      </div>
    </header>
    <div class="settings-shell">
    <!-- ───── 左导航 rail ───── -->
    <aside class="nav-rail">
      <button v-for="s in sections" :key="s.key"
        class="nav-item" :class="{ active: active === s.key }"
        @click="active = s.key">
        <span class="msi sm ic">{{ s.icon }}</span>
        <span class="lbl">{{ s.label }}</span>
      </button>
      <div class="nav-foot">
        <span class="badge">v0.1</span>
      </div>
    </aside>

    <!-- ───── 内容区 ───── -->
    <main class="content">
      <header class="page-head">
        <h1 class="h1">{{ activeSection?.label }}</h1>
        <Transition name="fade">
          <span v-if="notice.text" class="notice" :class="notice.kind">
            <span class="msi xxs">{{ notice.kind === 'ok' ? 'check_circle' : 'error' }}</span>
            {{ notice.text }}
          </span>
        </Transition>
      </header>

      <div v-if="errMsg" class="err-bar">{{ errMsg }}</div>
      <div v-if="loading || !settings" class="placeholder">加载中…</div>

      <template v-else>
        <!-- ━━━━━ 账户 ━━━━━ -->
        <template v-if="active === 'account'">
          <section class="card">
            <header class="sec-head">
              <div>
                <div class="sec-title">修改密码</div>
                <div class="sec-sub">用于本地 Web 登录;AI / 命令行走的是 API Token,不受影响。</div>
              </div>
            </header>
            <div class="form">
              <div class="row">
                <label>当前密码</label>
                <input class="text-input" type="password" v-model="pwd.old" autocomplete="current-password" />
              </div>
              <div class="row">
                <label>新密码 <span class="hint">至少 6 位</span></label>
                <input class="text-input" type="password" v-model="pwd.n1" autocomplete="new-password" />
              </div>
              <div class="row">
                <label>确认新密码</label>
                <input class="text-input" type="password" v-model="pwd.n2" autocomplete="new-password" />
              </div>
              <div v-if="pwdNotice.text" class="inline-msg" :class="pwdNotice.kind">{{ pwdNotice.text }}</div>
              <div class="actions">
                <button class="btn solid" :disabled="!canChangePwd" @click="changePwd">更新密码</button>
              </div>
            </div>
          </section>

          <section class="card">
            <header class="sec-head">
              <div>
                <div class="sec-title">退出登录</div>
                <div class="sec-sub">清除当前浏览器的 session cookie,下次访问会回到登录页。</div>
              </div>
              <button class="btn outline danger" @click="auth.logout()">退出</button>
            </header>
          </section>

          <section class="card">
            <header class="sec-head">
              <div>
                <div class="sec-title">忘记密码</div>
                <div class="sec-sub">单用户本地工具,没有找回流程。在终端执行下面这条 SQL 后,下次启动会回到首次设置流程:</div>
              </div>
            </header>
            <pre class="code-block">sqlite3 database/aios.db "DELETE FROM auth; DELETE FROM sessions;"</pre>
          </section>
        </template>

        <!-- ━━━━━ 模型 ━━━━━ -->
        <template v-else-if="active === 'model'">
          <section class="card">
            <header class="sec-head">
              <div>
                <div class="sec-title">大模型 API</div>
                <div class="sec-sub">选一个供应商,填好 URL / API Key / 模型名。每个供应商的配置会在本地缓存。</div>
              </div>
            </header>
            <div class="form">
              <div class="row">
                <label>供应商</label>
                <div class="provider-row">
                  <select class="text-input select" :value="settings.provider" @change="onProviderChange($event.target.value)">
                    <optgroup v-for="g in providerGroups" :key="g.id" :label="g.name">
                      <option v-for="p in providersByGroup(g.id)" :key="p.id" :value="p.id">{{ p.name }}</option>
                    </optgroup>
                  </select>
                  <a v-if="currentProviderMeta?.keyUrl" :href="currentProviderMeta.keyUrl"
                    target="_blank" rel="noopener" class="btn tonal small">
                    <span class="msi xxs">key</span> 获取 API Key
                  </a>
                </div>
              </div>
              <div class="row">
                <label>API URL</label>
                <input class="text-input" v-model="settings.apiUrl" placeholder="https://api.example.com/v1/chat/completions" spellcheck="false" />
              </div>
              <div class="row">
                <label>API Key</label>
                <input class="text-input mono" type="password" v-model="settings.apiKey" placeholder="sk-..." spellcheck="false" />
              </div>
              <div class="row">
                <label>模型</label>
                <input class="text-input mono" v-model="settings.model" :placeholder="currentProviderMeta?.defaultModel || ''" spellcheck="false" />
              </div>
              <div class="actions">
                <button class="btn solid" @click="saveModel">保存</button>
              </div>
            </div>
          </section>
        </template>

        <!-- ━━━━━ 提示词 ━━━━━ -->
        <template v-else-if="active === 'prompt'">
          <section class="card prompt-card">
            <header class="sec-head">
              <div>
                <div class="sec-title">系统提示词</div>
                <div class="sec-sub">每次对话前注入到模型上下文最前面。改动后立即生效,无需重启。</div>
              </div>
              <button class="btn solid" @click="savePrompt">保存</button>
            </header>
            <textarea class="prompt-area" v-model="prompt" spellcheck="false" rows="22"
              placeholder="例如:你是 AIOS 的本机 AI 助理,可以读文件、跑命令、查系统状态…"></textarea>
            <div class="prompt-meta">{{ prompt.length }} 字符</div>
          </section>
        </template>

        <!-- ━━━━━ 上下文(轮数) ━━━━━ -->
        <template v-else-if="active === 'context'">
          <section class="card">
            <header class="sec-head">
              <div>
                <div class="sec-title">历史轮数</div>
                <div class="sec-sub">每次新提问会带上最近 N 轮对话作为上下文。轮数越多上下文越丰富,但也越费 token。</div>
              </div>
            </header>
            <div class="seg">
              <button v-for="n in [30, 100, 500]" :key="n"
                class="seg-btn" :class="{ active: settings.contextRounds === n }"
                @click="settings.contextRounds = n">
                <span class="seg-n">{{ n }}</span>
                <span class="seg-l">{{ n === 30 ? '精简' : n === 100 ? '标准' : '最大' }}</span>
              </button>
            </div>
            <div class="actions" style="margin-top:14px">
              <button class="btn solid" @click="saveContext">保存</button>
            </div>
          </section>
        </template>

        <!-- ━━━━━ 上下文资源 ━━━━━ -->
        <template v-else-if="active === 'sources'">
          <section class="card">
            <header class="sec-head">
              <div>
                <div class="sec-title">上下文资源</div>
                <div class="sec-sub">系统能在对话里读取的资源列表(任务、文档、备忘等),由后端按 source 自动收集。</div>
              </div>
              <button class="btn tonal small" @click="loadContexts">
                <span class="msi xxs">refresh</span> 刷新
              </button>
            </header>
            <div v-if="!contextItems.length" class="empty">暂无可读取的资源。</div>
            <div v-else class="ctx-list">
              <article v-for="it in contextItems" :key="it.source + ':' + it.sourceId" class="ctx">
                <div class="ctx-row">
                  <span class="src-tag">{{ it.source }}</span>
                  <h4 class="ctx-title">{{ it.title || (it.source + ':' + it.sourceId) }}</h4>
                  <span class="pill" :class="accessClass(it.access)">{{ accessLabel(it.access) }}</span>
                </div>
                <p v-if="it.summary" class="ctx-sum">{{ it.summary }}</p>
                <div class="ctx-meta">
                  <span class="mono">{{ it.sourceId }}</span>
                  <span v-if="it.updatedAt">{{ it.updatedAt }}</span>
                </div>
              </article>
            </div>
          </section>
        </template>

        <!-- ━━━━━ 工具调用 ━━━━━ -->
        <template v-else-if="active === 'tools'">
          <section class="card">
            <header class="sec-head">
              <div>
                <div class="sec-title">工具结果截断</div>
                <div class="sec-sub">某些工具(读大文件、长 shell 输出)会返回超长内容,直接塞回模型可能把上下文撑爆。开启后会截断到下面的字符数。</div>
              </div>
              <label class="switch" :class="{ on: settings.enableToolResultTruncate }">
                <input type="checkbox" v-model="settings.enableToolResultTruncate" />
              </label>
            </header>
            <div class="form">
              <div class="row inline">
                <label>截断字符数</label>
                <input class="text-input num" type="number" min="1000" max="50000" step="1000"
                  :disabled="!settings.enableToolResultTruncate"
                  v-model.number="settings.toolResultMaxChars" />
                <span class="hint">建议 8000 ~ 20000</span>
              </div>
            </div>
          </section>

          <section class="card">
            <header class="sec-head">
              <div>
                <div class="sec-title">最大工具调用轮数</div>
                <div class="sec-sub">单次对话里 AI 连续调用工具的硬上限,防止 agent 跑飞。</div>
              </div>
              <label class="switch" :class="{ on: settings.enableToolLoopLimit }">
                <input type="checkbox" v-model="settings.enableToolLoopLimit" />
              </label>
            </header>
            <div class="form">
              <div class="row inline">
                <label>最大轮数</label>
                <input class="text-input num" type="number" min="1" max="500" step="1"
                  :disabled="!settings.enableToolLoopLimit"
                  v-model.number="settings.toolMaxRounds" />
                <span class="hint">默认 50</span>
              </div>
              <div class="actions">
                <button class="btn solid" @click="saveTools">保存</button>
              </div>
            </div>
          </section>
        </template>

        <!-- ━━━━━ 关于 ━━━━━ -->
        <template v-else-if="active === 'about'">
          <section class="card about">
            <div class="about-head">
              <div class="logo">
                <svg viewBox="0 0 24 24" width="48" height="48">
                  <circle cx="12" cy="12" r="10" fill="#1a73e8"/>
                  <path d="M11 16.5L6.5 12l1.4-1.4L11 13.7l5.6-5.6L18 9.5z" fill="#fff"/>
                </svg>
              </div>
              <div>
                <div class="about-name">AIOS</div>
                <div class="about-tag">本地 AI 操作系统 · gui2</div>
              </div>
            </div>
            <div class="about-grid">
              <div class="kv"><span>版本</span><span>0.1.0</span></div>
              <div class="kv"><span>主机</span><span>{{ sysSnap?.sys?.hostname || '—' }}</span></div>
              <div class="kv"><span>平台</span><span>{{ sysSnap?.sys?.platform || '—' }} / {{ sysSnap?.sys?.arch || '—' }}</span></div>
              <div class="kv"><span>Node</span><span>{{ sysSnap?.sys?.nodeVersion || '—' }}</span></div>
              <div class="kv"><span>Provider</span><span>{{ settings.provider }}</span></div>
              <div class="kv"><span>Model</span><span class="mono">{{ settings.model }}</span></div>
            </div>
          </section>
        </template>
      </template>
    </main>
    </div>
  </div>
</template>

<style scoped>
/* ─── 顶栏(自有,不依赖任何共享组件) ─── */
.topbar {
  flex: none; height: 64px;
  display: flex; align-items: center;
  padding: 8px 16px;
  background: var(--bg);
}
.left-spacer { width: 8px; }
.topbar .brand { flex: 1; min-width: 0; margin: 0 4px 0 12px; }
.topbar .brand .name { font-size: 20px; font-weight: 500; letter-spacing: -0.01em; }
.topbar .right { display: flex; align-items: center; gap: 4px; margin-left: auto; }
@media (max-width: 720px) {
  .topbar { padding: 8px; height: 56px; }
  .topbar .brand .name { font-size: 17px; }
}

/* ─────────── 整体壳 ─────────── */
.settings-shell {
  flex: 1; min-width: 0; min-height: 0;
  display: flex;
  background: #f7f9fc;
}

/* ─────────── 左导航 ─────────── */
.nav-rail {
  flex: none;
  width: 240px;
  display: flex; flex-direction: column;
  padding: 24px 12px 12px;
  background: transparent;
}
.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px;
  border: 0; background: transparent;
  border-radius: 22px;
  color: var(--text-2);
  text-align: left;
  font-size: 13.5px; font-weight: 500;
  cursor: pointer;
  transition: background .12s, color .12s;
}
.nav-item .ic { color: var(--text-3); }
.nav-item:hover { background: rgba(60,64,67,0.06); color: var(--text); }
.nav-item:hover .ic { color: var(--text-2); }
.nav-item.active { background: var(--accent-soft); color: var(--accent-fg); }
.nav-item.active .ic { color: var(--accent-fg); }
.nav-foot { margin-top: auto; padding: 8px 14px 4px; }
.badge {
  display: inline-block; padding: 2px 8px;
  background: var(--bg-elev); color: var(--text-3);
  border-radius: 10px; font-size: 11px; font-variant-numeric: tabular-nums;
}

/* ─────────── 内容 ─────────── */
.content {
  flex: 1; min-width: 0; min-height: 0;
  overflow-y: auto;
  padding: 24px 32px 60px;
  max-width: 920px;
  margin: 0 auto;
  width: 100%;
}
.page-head {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 16px; margin-bottom: 18px;
}
.crumb { font-size: 11.5px; color: var(--text-3); letter-spacing: 0.04em; }
.h1 { margin: 4px 0 0; font-size: 26px; font-weight: 500; letter-spacing: -0.015em; }
.notice {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 999px;
  font-size: 12.5px; font-weight: 500;
}
.notice.ok  { background: #e6f4ea; color: var(--good); }
.notice.err { background: #fce8e6; color: var(--bad); }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.err-bar { padding: 10px 14px; background: #fce8e6; color: var(--bad); border-radius: 10px; font-size: 13px; margin-bottom: 14px; }
.placeholder { color: var(--text-3); padding: 60px; text-align: center; }

/* ─────────── 卡片 ─────────── */
.card {
  background: #fff;
  border-radius: 16px;
  padding: 22px 24px;
  margin-bottom: 14px;
  box-shadow: 0 1px 2px rgba(60,64,67,0.06), 0 4px 12px rgba(60,64,67,0.04);
}
.sec-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}
.sec-head:last-child { margin-bottom: 0; }
.sec-title { font-size: 15.5px; font-weight: 500; letter-spacing: -0.005em; }
.sec-sub { font-size: 12.5px; color: var(--text-2); margin-top: 4px; line-height: 1.55; max-width: 540px; }

/* ─────────── 表单 ─────────── */
.form { display: flex; flex-direction: column; gap: 14px; }
.row { display: flex; flex-direction: column; gap: 6px; }
.row.inline { flex-direction: row; align-items: center; gap: 12px; }
.row label {
  font-size: 11.5px; color: var(--text-2);
  letter-spacing: 0.04em; text-transform: uppercase; font-weight: 500;
}
.row label .hint { text-transform: none; letter-spacing: 0; color: var(--text-3); margin-left: 8px; font-weight: 400; }
.text-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--text);
  border-radius: 10px;
  font-size: 14px;
  outline: 0;
  transition: border-color .15s, box-shadow .15s;
}
.text-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.text-input::placeholder { color: var(--text-3); }
.text-input.mono { font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 13px; }
.text-input.num { width: 120px; font-variant-numeric: tabular-nums; }
.text-input.select { appearance: none; cursor: pointer; padding-right: 36px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2380868b' stroke-width='2'><path d='M6 9l6 6 6-6'/></svg>");
  background-repeat: no-repeat; background-position: right 12px center;
}
.provider-row { display: flex; gap: 8px; align-items: center; }
.provider-row .text-input.select { flex: 1; min-width: 0; }
.hint { font-size: 11.5px; color: var(--text-3); }

.actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }

.inline-msg { padding: 8px 12px; border-radius: 10px; font-size: 12.5px; }
.inline-msg.ok  { background: #e6f4ea; color: var(--good); }
.inline-msg.err { background: #fce8e6; color: var(--bad); }

/* ─────────── 按钮 ─────────── */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 20px;
  border: 0; border-radius: 22px;
  font-size: 13.5px; font-weight: 500;
  cursor: pointer;
  transition: background .15s, box-shadow .15s, color .15s, border-color .15s;
}
.btn.small { padding: 6px 12px; font-size: 12.5px; border-radius: 16px; }
.btn.solid  { background: var(--accent); color: #fff; }
.btn.solid:hover:not(:disabled) { background: var(--accent-hi); box-shadow: 0 1px 3px rgba(26,115,232,0.4); }
.btn.solid:disabled { opacity: .4; cursor: default; box-shadow: none; }
.btn.tonal  { background: var(--accent-soft); color: var(--accent-fg); }
.btn.tonal:hover { background: #d2e3fc; }
.btn.outline { background: transparent; color: var(--text-2); border: 1px solid var(--line); }
.btn.outline:hover { background: var(--bg-hover); color: var(--text); }
.btn.outline.danger:hover { color: var(--bad); border-color: var(--bad); background: rgba(217,48,37,0.04); }

/* ─────────── 开关 (Material 3 switch) ─────────── */
.switch {
  flex: none;
  position: relative;
  width: 48px; height: 28px;
  background: var(--bg-elev);
  border: 2px solid var(--line);
  border-radius: 14px;
  cursor: pointer;
  transition: background .18s, border-color .18s;
}
.switch input { position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer; }
.switch::after {
  content: '';
  position: absolute;
  top: 4px; left: 4px;
  width: 16px; height: 16px;
  background: var(--text-2);
  border-radius: 50%;
  transition: transform .2s, background .2s, width .2s, height .2s, top .2s, left .2s;
}
.switch.on { background: var(--accent); border-color: var(--accent); }
.switch.on::after { background: #fff; width: 20px; height: 20px; top: 2px; left: 22px; }

/* ─────────── 段控件(轮数) ─────────── */
.seg {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.seg-btn {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 14px;
  border: 1px solid var(--line);
  background: transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: background .12s, border-color .12s;
}
.seg-btn:hover { background: var(--bg-hover); }
.seg-btn.active { background: var(--accent-soft); border-color: var(--accent-soft); }
.seg-n { font-size: 22px; font-weight: 500; color: var(--text); letter-spacing: -0.01em; }
.seg-btn.active .seg-n { color: var(--accent-fg); }
.seg-l { font-size: 11.5px; color: var(--text-3); }
.seg-btn.active .seg-l { color: var(--accent-fg); }

/* ─────────── 提示词大输入 ─────────── */
.prompt-card { display: flex; flex-direction: column; }
.prompt-area {
  width: 100%;
  min-height: 420px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fafbfc;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  font-size: 13px;
  line-height: 1.65;
  color: var(--text);
  outline: 0;
  resize: vertical;
  transition: border-color .15s, box-shadow .15s, background .15s;
}
.prompt-area:focus { border-color: var(--accent); background: #fff; box-shadow: 0 0 0 3px var(--accent-soft); }
.prompt-meta { margin-top: 8px; font-size: 11.5px; color: var(--text-3); text-align: right; }

/* ─────────── 上下文资源列表 ─────────── */
.empty { padding: 40px; text-align: center; color: var(--text-3); font-size: 13px;
  background: #fafbfc; border-radius: 12px; }
.ctx-list { display: flex; flex-direction: column; gap: 10px; }
.ctx { padding: 14px 16px; background: #fafbfc; border-radius: 12px; }
.ctx-row { display: flex; align-items: center; gap: 10px; }
.ctx-title { margin: 0; flex: 1; min-width: 0; font-size: 14px; font-weight: 500;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.src-tag { padding: 2px 8px; background: var(--bg-elev); color: var(--text-2);
  border-radius: 6px; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 500; }
.pill { padding: 2px 10px; border-radius: 12px; font-size: 11.5px; font-weight: 500; }
.pill-blue { background: var(--accent-soft); color: var(--accent-fg); }
.pill-soft { background: #fef7e0; color: #b06000; }
.pill-mute { background: var(--bg-elev); color: var(--text-3); }
.ctx-sum { margin: 6px 0 0; font-size: 12.5px; line-height: 1.55; color: var(--text-2);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ctx-meta { margin-top: 8px; display: flex; gap: 12px; font-size: 11px; color: var(--text-3); }
.mono { font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; }

/* ─────────── 代码块 ─────────── */
.code-block {
  margin: 0;
  padding: 12px 14px;
  background: #1e1e1e; color: #e8eaed;
  border-radius: 10px;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  font-size: 12.5px; line-height: 1.55;
  overflow-x: auto;
}

/* ─────────── 关于卡 ─────────── */
.about-head { display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
.about-name { font-size: 22px; font-weight: 500; letter-spacing: -0.015em; }
.about-tag { font-size: 12.5px; color: var(--text-2); margin-top: 2px; }
.about-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 24px; }
.kv { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--line-soft); font-size: 13px; }
.kv span:first-child { color: var(--text-2); }

/* ─────────── 移动端 ─────────── */
@media (max-width: 760px) {
  .settings-shell { flex-direction: column; }
  .nav-rail {
    width: auto; flex-direction: row;
    overflow-x: auto; padding: 8px;
  }
  .nav-head { display: none; }
  .nav-item { padding: 8px 12px; flex-direction: column; gap: 2px; min-width: 64px; }
  .nav-item .lbl { font-size: 11px; }
  .nav-foot { display: none; }
  .content { padding: 16px 16px 40px; }
  .h1 { font-size: 22px; }
  .about-grid { grid-template-columns: 1fr; }
}
</style>
