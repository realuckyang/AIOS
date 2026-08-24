<script setup>
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue';
import * as api from '@/utils/api.js';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';

// ─── state ────────────────────────────────────
const config = ref(null);
const reports = ref([]);
const loading = ref(false);
const errMsg = ref('');

// 配置卡有两种态: 'view' 阅读态 / 'edit' 编辑态
const cardMode = ref('view');
const draft = ref({ topic: '', schedule_time: '08:00', enabled: true });

// 已展开阅读详情的早报 id
const opened = ref(new Set());
const isOpen = (id) => opened.value.has(id);
const toggleOpen = (id) => {
  const next = new Set(opened.value);
  next.has(id) ? next.delete(id) : next.add(id);
  opened.value = next;
};

const notice = ref({ kind: '', text: '' });
let noticeTimer = null;
function flash(kind, text, ms = 2200) {
  notice.value = { kind, text };
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.value = { kind: '', text: '' }; }, ms);
}

// ─── 数据 ─────────────────────────────────────
async function loadConfig() {
  try {
    const r = await api.get('/apps/subbox/config');
    config.value = r?.config || null;
  } catch (e) { errMsg.value = '获取订阅失败: ' + (e?.body?.message || e.message || e); }
}
async function loadReports() {
  try {
    const r = await api.get('/apps/subbox/reports', { query: { limit: 100 } });
    reports.value = r?.items || [];
  } catch { reports.value = []; }
}
async function loadAll() {
  loading.value = true;
  await Promise.all([loadConfig(), loadReports()]);
  loading.value = false;
}

// ─── 操作 ─────────────────────────────────────
function startEdit() {
  draft.value = config.value
    ? { topic: config.value.topic || '', schedule_time: config.value.schedule_time || '08:00', enabled: !!config.value.enabled }
    : { topic: '', schedule_time: '08:00', enabled: true };
  cardMode.value = 'edit';
}
function cancelEdit() {
  cardMode.value = 'view';
}
async function save() {
  if (!draft.value.topic.trim()) { flash('err', '请填写订阅主题'); return; }
  try {
    const r = await api.post('/apps/subbox/config', draft.value);
    config.value = r?.config || null;
    cardMode.value = 'view';
    flash('ok', '已保存');
  } catch (e) { flash('err', '保存失败: ' + (e?.body?.message || e.message)); }
}
async function toggleEnabled() {
  if (!config.value || !config.value.topic) return;
  try {
    const r = await api.post('/apps/subbox/config', { enabled: !config.value.enabled });
    config.value = r?.config || null;
    flash('ok', config.value.enabled ? '已开启每日派送' : '已暂停');
  } catch (e) { flash('err', '切换失败: ' + (e?.body?.message || e.message)); }
}
async function runNow() {
  try {
    await api.post('/apps/subbox/run-now', {});
    flash('ok', '已开始派送,稍候刷新');
    await loadConfig();
    setTimeout(loadAll, 6000);
  } catch (e) { flash('err', '派送失败: ' + (e?.body?.message || e.message)); }
}
async function clearHistory() {
  if (!reports.value.length) return;
  if (!confirm(`清空全部 ${reports.value.length} 份历史早报?此操作不可撤销。`)) return;
  try {
    await api.post('/apps/subbox/reports/clear', {});
    await loadReports();
    flash('ok', '已清空');
  } catch (e) { flash('err', '清空失败: ' + (e?.body?.message || e.message)); }
}

// ─── 轮询 ─────────────────────────────────────
let pollTimer = null;
function startPoll() { if (pollTimer) return; pollTimer = setInterval(loadAll, 15000); }
function stopPoll() { clearInterval(pollTimer); pollTimer = null; }
onMounted(() => { loadAll(); startPoll(); });
onActivated(() => { loadAll(); startPoll(); });
onDeactivated(stopPoll);
onBeforeUnmount(stopPoll);

// ─── 时间 ─────────────────────────────────────
const now = ref(new Date());
let nowTicker = null;
onMounted(() => { nowTicker = setInterval(() => { now.value = new Date(); }, 30 * 1000); });
onBeforeUnmount(() => clearInterval(nowTicker));

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
function fmtMasthead(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day} · 周${WEEKDAYS[d.getDay()]}`;
}
function fmtMd(iso) {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function fmtClock(iso) {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function fmtRelDay(iso) {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d.getTime())) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const that = new Date(d); that.setHours(0, 0, 0, 0);
  const days = Math.round((today - that) / 86400000);
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days === 2) return '前天';
  if (days < 7) return `${days} 天前`;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayStr() {
  const d = now.value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── 派生 ─────────────────────────────────────
const hasTopic = computed(() => !!(config.value && config.value.topic));
const isEnabled = computed(() => !!(config.value && config.value.enabled));
const isRunning = computed(() => !!(config.value && config.value.running));

const phase = computed(() => {
  if (!config.value || !config.value.topic) return 'empty';
  if (config.value.running) return 'running';
  if (!config.value.enabled) return 'paused';
  if (config.value.last_run_date === todayStr()) {
    return config.value.last_status === 'error' ? 'failed' : 'delivered';
  }
  return 'idle';
});
const phaseLabel = computed(() => ({
  empty:     { text: '尚未订阅', cls: 'mute',  icon: 'mark_email_unread' },
  delivered: { text: '今日已送达', cls: 'ok',  icon: 'mark_email_read' },
  running:   { text: '正在派送…',  cls: 'run', icon: 'autorenew' },
  failed:    { text: '今日派送失败', cls: 'err', icon: 'error' },
  paused:    { text: '已暂停',      cls: 'mute', icon: 'pause_circle' },
  idle:      { text: '等待下次派送', cls: 'idle', icon: 'schedule' }
}[phase.value]));

const countdownText = computed(() => {
  if (!hasTopic.value || !isEnabled.value) return '';
  const cfg = config.value;
  const today = todayStr();
  const [hh, mm] = String(cfg.schedule_time || '08:00').split(':').map((n) => parseInt(n, 10));
  const targetMin = (hh || 0) * 60 + (mm || 0);
  const nowMin = now.value.getHours() * 60 + now.value.getMinutes();
  let delta;
  let when;
  if (cfg.last_run_date !== today && targetMin >= nowMin) {
    delta = targetMin - nowMin; when = '今天';
  } else {
    delta = (24 * 60 - nowMin) + targetMin; when = '明天';
  }
  if (delta <= 0) return '即将送达';
  const h = Math.floor(delta / 60), m = delta % 60;
  if (h === 0) return `${m} 分钟后送达`;
  if (h < 24) return `${h} 小时 ${m} 分钟后送达`;
  return `${when} ${cfg.schedule_time} 送达`;
});

const todaysReportCount = computed(() => {
  const t = todayStr();
  return reports.value.filter((r) => (r.created_at || '').slice(0, 10) === t).length;
});

function previewLine(summary) {
  const t = String(summary || '').trim();
  if (!t) return '';
  const first = t.split('\n').find((l) => l.trim());
  return (first || '').slice(0, 80);
}
</script>

<template>
  <div class="app-frame subbox">
    <!-- ── topbar ── -->
    <header class="topbar">
      <span class="left-spacer"></span>
      <div class="brand">
        <span class="msi xs brand-icon">inbox</span>
        <span class="name">订阅箱</span>
      </div>
      <div class="right">
        <ChatTrigger />
        <AppsTrigger />
      </div>
    </header>

    <transition name="fade">
      <div v-if="notice.text" class="notice" :class="notice.kind">{{ notice.text }}</div>
    </transition>
    <div v-if="errMsg" class="err-bar">{{ errMsg }}</div>

    <section class="page">
      <!-- ── 报刊头 ── -->
      <header class="masthead">
        <div class="mast-text">
          <div class="mast-date">{{ fmtMasthead(now) }}</div>
          <h1 class="mast-title">每日早报</h1>
          <p class="mast-sub">用一句话告诉 AI 你想订阅什么,每天到点自动送来。</p>
        </div>
        <div class="mast-illust">
          <span class="msi">newspaper</span>
        </div>
      </header>

      <!-- ── 订阅配置卡 ── -->
      <article class="sub-card" :class="phase">
        <!-- 阅读态 ────────────────────────────── -->
        <template v-if="cardMode === 'view'">
          <!-- 空态:还没订阅 -->
          <template v-if="!hasTopic">
            <div class="empty-state">
              <span class="msi empty-icon">add_alert</span>
              <h3>还没有订阅</h3>
              <p>设置一个订阅主题和每日时间,AI 就会每天到点送你一份早报。</p>
              <button class="m3-filled" @click="startEdit">
                <span class="msi xxs">edit</span>设置我的订阅
              </button>
            </div>
          </template>

          <!-- 已订阅 -->
          <template v-else>
            <header class="sc-head">
              <div class="sc-stamp">
                <span class="msi xxs">{{ phaseLabel.icon }}</span>
                <span>{{ phaseLabel.text }}</span>
              </div>
              <div class="sc-time-chip">
                <span class="msi xxs">schedule</span>
                <span>每日 {{ config.schedule_time }}</span>
              </div>
            </header>

            <div class="sc-topic">
              <div class="sc-topic-label">订阅主题</div>
              <p class="sc-topic-text">{{ config.topic }}</p>
            </div>

            <footer class="sc-foot">
              <div class="sc-meta">
                <span v-if="countdownText" class="sc-countdown">
                  <span class="msi xxs">notifications_active</span>{{ countdownText }}
                </span>
                <span v-if="config.last_run_at" class="sc-last">
                  上次送达 {{ fmtRelDay(config.last_run_at) }} {{ fmtClock(config.last_run_at) }}
                </span>
              </div>
              <div class="sc-actions">
                <button class="icon-btn"
                        :class="{ active: isEnabled }"
                        :title="isEnabled ? '暂停' : '开启'"
                        @click="toggleEnabled">
                  <span class="msi sm">{{ isEnabled ? 'pause' : 'play_arrow' }}</span>
                </button>
                <button class="icon-btn"
                        title="立即派送一份"
                        :disabled="isRunning"
                        @click="runNow">
                  <span class="msi sm" :class="{ spin: isRunning }">{{ isRunning ? 'autorenew' : 'send' }}</span>
                </button>
                <button class="icon-btn" title="编辑" @click="startEdit">
                  <span class="msi sm">edit</span>
                </button>
              </div>
            </footer>
          </template>
        </template>

        <!-- 编辑态 ────────────────────────────── -->
        <template v-else>
          <header class="sc-edit-head">
            <span class="msi sc-edit-icon">{{ hasTopic ? 'edit_note' : 'add_circle' }}</span>
            <h3>{{ hasTopic ? '编辑订阅' : '设置订阅' }}</h3>
          </header>

          <div class="sc-edit-body">
            <label class="field">
              <span class="field-label">订阅主题 <em>*</em></span>
              <textarea v-model="draft.topic" class="text-input" rows="3"
                placeholder="例如:今天全球 AI 行业的重大进展和重要新闻;或:A 股大盘 + AAPL/TSLA 走势 + 美股盘前要闻"></textarea>
              <span class="field-help">越具体效果越好,AI 会用 curl/搜索工具拉真实数据。</span>
            </label>
            <div class="field-row">
              <label class="field flex-1">
                <span class="field-label">每日派送时间</span>
                <input v-model="draft.schedule_time" class="text-input" type="time" step="60" />
              </label>
              <label class="field switch">
                <span class="field-label">启用</span>
                <span class="m3-switch" :class="{ on: draft.enabled }"
                      @click.prevent="draft.enabled = !draft.enabled">
                  <span class="m3-thumb"></span>
                </span>
              </label>
            </div>
          </div>

          <footer class="sc-edit-foot">
            <button class="m3-text" @click="cancelEdit">取消</button>
            <button class="m3-filled" @click="save">
              <span class="msi xxs">save</span>保存
            </button>
          </footer>
        </template>
      </article>

      <!-- ── 早报时间线 ── -->
      <section v-if="hasTopic" class="reports">
        <header class="rp-head">
          <div class="rp-title">
            <h2>早报历史</h2>
            <span class="rp-count">{{ reports.length }} 份</span>
            <span v-if="todaysReportCount" class="rp-today-pill">含 {{ todaysReportCount }} 份今日</span>
          </div>
          <div class="rp-actions">
            <button v-if="reports.length" class="icon-btn" title="清空" @click="clearHistory">
              <span class="msi sm">delete_sweep</span>
            </button>
            <button class="icon-btn" title="刷新" @click="loadAll">
              <span class="msi sm">refresh</span>
            </button>
          </div>
        </header>

        <div v-if="!reports.length" class="rp-empty">
          <span class="msi" style="font-size: 44px; opacity: .25;">drafts</span>
          <p>还没有任何早报。到点会自动生成,也可以点 <span class="msi xxs">send</span> 立即派送一份。</p>
        </div>

        <div v-else class="timeline">
          <article v-for="r in reports" :key="r.id" class="paper" :class="{ failed: !r.ok, open: isOpen(r.id) }">
            <button class="paper-row" @click="toggleOpen(r.id)">
              <span class="paper-stamp" :class="{ err: !r.ok }">
                <span class="msi xxs">{{ r.ok ? 'mark_email_read' : 'error' }}</span>
              </span>
              <div class="paper-line">
                <div class="paper-line-top">
                  <span class="paper-day">{{ fmtRelDay(r.created_at) }}</span>
                  <span class="paper-clock">{{ fmtClock(r.created_at) }}</span>
                  <span v-if="!r.ok" class="paper-tag err">失败</span>
                </div>
                <div class="paper-preview" v-if="r.ok">{{ previewLine(r.summary) }}</div>
                <div class="paper-preview err" v-else>⚠ {{ (r.error || '未知错误').slice(0, 80) }}</div>
              </div>
              <span class="msi paper-chev" :class="{ rot: isOpen(r.id) }">expand_more</span>
            </button>
            <transition name="reveal">
              <div v-if="isOpen(r.id)" class="paper-body-wrap">
                <pre v-if="r.ok" class="paper-body">{{ r.summary }}</pre>
                <p v-else class="paper-error">⚠ {{ r.error || '未知错误' }}</p>
              </div>
            </transition>
          </article>
        </div>
      </section>
    </section>
  </div>
</template>

<style scoped>
.subbox {
  --pri: var(--accent);
  --pri-hi: var(--accent-hi);
  --pri-fg: var(--accent-fg);
  --pri-soft: var(--accent-soft);
  --r-md: 12px;
  --r-lg: 16px;
  --r-xl: 28px;
  background: var(--bg);
}

/* topbar */
.topbar {
  flex: none; height: 64px;
  display: flex; align-items: center;
  padding: 8px 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--line-soft);
}
.left-spacer { width: 8px; }
.brand { flex: 1; min-width: 0; margin: 0 4px 0 12px; display: flex; align-items: center; gap: 8px; }
.brand-icon { color: var(--pri); }
.brand .name { font-size: 20px; font-weight: 500; letter-spacing: -0.01em; }
.right { display: flex; align-items: center; gap: 4px; margin-left: auto; }

/* notice */
.notice { margin: 8px 24px 0; padding: 10px 14px; border-radius: 8px; font-size: 13px; }
.notice.ok  { background: #e6f4ea; color: #137333; }
.notice.err { background: #fce8e6; color: var(--bad); }
.err-bar { margin: 8px 24px; padding: 10px 14px; background: #fce8e6; color: var(--bad); border-radius: 8px; font-size: 13px; }

/* page */
.page {
  flex: 1; min-height: 0;
  overflow-y: auto;
  padding: 24px 32px 60px;
  background: #f7f9fc;
}

/* ── masthead ── */
.masthead {
  max-width: 880px; margin: 0 auto 18px;
  padding: 28px 32px;
  border-radius: var(--r-lg);
  background: linear-gradient(135deg, #e8f0fe 0%, #d4e4ff 60%, #c2d6fb 100%);
  color: var(--pri-fg);
  display: flex; align-items: center; gap: 24px;
  position: relative; overflow: hidden;
}
.masthead::after {
  content: ''; position: absolute; right: -60px; top: -60px;
  width: 240px; height: 240px;
  background: radial-gradient(circle, rgba(255,255,255,0.55) 0%, transparent 70%);
  pointer-events: none;
}
.mast-text { flex: 1; min-width: 0; }
.mast-date { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.08em; opacity: 0.75; text-transform: uppercase; }
.mast-title { margin: 6px 0 4px; font-size: 28px; font-weight: 500; letter-spacing: -0.02em; line-height: 1.1; }
.mast-sub { margin: 0; font-size: 13px; opacity: 0.78; line-height: 1.55; }
.mast-illust { flex: none; opacity: 0.7; }
.mast-illust .msi { font-size: 64px; color: var(--pri); }

/* ── 订阅卡 ── */
.sub-card {
  max-width: 880px; margin: 0 auto 24px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 0;
  overflow: hidden;
  transition: border-color .18s, box-shadow .18s;
}
.sub-card:hover { box-shadow: var(--shadow-1); }
.sub-card.delivered { border-color: rgba(30,142,62,0.35); }
.sub-card.failed    { border-color: rgba(217,48,37,0.35); }
.sub-card.running   { border-color: var(--pri); }

/* 空态 */
.empty-state {
  padding: 48px 28px;
  text-align: center;
  color: var(--text-2);
}
.empty-state .empty-icon { font-size: 56px; color: var(--pri); opacity: 0.55; }
.empty-state h3 { margin: 12px 0 4px; font-size: 18px; font-weight: 500; color: var(--text); }
.empty-state p  { margin: 0 auto 20px; font-size: 13.5px; max-width: 420px; line-height: 1.55; }

/* 阅读态 head/topic/foot */
.sc-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 24px;
  border-bottom: 1px dashed var(--line-soft);
}
.sc-stamp {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--bg-elev);
  font-size: 12px; font-weight: 500;
  color: var(--text-2);
}
.sub-card.delivered .sc-stamp { background: #e6f4ea; color: #137333; }
.sub-card.failed    .sc-stamp { background: #fce8e6; color: var(--bad); }
.sub-card.running   .sc-stamp { background: var(--pri-soft); color: var(--pri-fg); }
.sub-card.running   .sc-stamp .msi { animation: spin 1.2s linear infinite; }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
.sc-time-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--pri-soft); color: var(--pri-fg);
  font-size: 12.5px; font-weight: 500;
  font-family: var(--font-mono);
}

.sc-topic {
  padding: 20px 24px 12px;
}
.sc-topic-label {
  font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--text-3); font-weight: 600;
}
.sc-topic-text {
  margin: 8px 0 0;
  font-size: 17px; line-height: 1.55;
  color: var(--text);
  letter-spacing: -0.005em;
  white-space: pre-wrap; word-break: break-word;
}

.sc-foot {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px 14px 24px;
  gap: 12px; flex-wrap: wrap;
  border-top: 1px solid var(--line-soft);
  background: #fafbfd;
}
.sc-meta { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; min-width: 0; }
.sc-countdown { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; color: var(--pri-fg); font-weight: 500; }
.sc-last { font-size: 12px; color: var(--text-3); font-family: var(--font-mono); }
.sc-actions { display: flex; gap: 2px; }
.sc-actions .icon-btn { width: 40px; height: 40px; }
.sc-actions .icon-btn .spin { animation: spin 1.2s linear infinite; }
.sc-actions .icon-btn:disabled { opacity: 0.35; pointer-events: none; }

/* 编辑态 */
.sc-edit-head {
  display: flex; align-items: center; gap: 12px;
  padding: 22px 24px 6px;
}
.sc-edit-icon { color: var(--pri); font-size: 26px; }
.sc-edit-head h3 { margin: 0; font-size: 19px; font-weight: 500; letter-spacing: -0.01em; }
.sc-edit-body {
  padding: 12px 24px 4px;
  display: flex; flex-direction: column; gap: 16px;
}
.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.field-label { font-size: 12px; color: var(--text-2); font-weight: 500; letter-spacing: 0.02em; }
.field-label em { color: var(--bad); font-style: normal; }
.field-help { font-size: 11.5px; color: var(--text-3); margin-top: 2px; }
.field-row { display: flex; gap: 16px; align-items: flex-end; }
.flex-1 { flex: 1; }
.field.switch { flex: none; }
.text-input {
  width: 100%; padding: 10px 14px;
  border: 1px solid var(--line); background: var(--bg);
  color: var(--text); border-radius: 8px;
  font-size: 14px; outline: 0;
  font-family: inherit;
  transition: border-color .15s, box-shadow .15s;
}
textarea.text-input { resize: vertical; line-height: 1.55; }
.text-input:focus { border-color: var(--pri); box-shadow: 0 0 0 3px var(--pri-soft); }

.sc-edit-foot {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 16px 22px 22px;
}

/* M3 buttons */
.m3-filled {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 22px;
  background: var(--pri); color: #fff;
  border: 0; border-radius: 999px;
  font-size: 13.5px; font-weight: 500;
  transition: background .15s, box-shadow .15s;
}
.m3-filled:hover { background: var(--pri-hi); box-shadow: var(--shadow-1); }
.m3-text {
  padding: 10px 22px;
  background: transparent; border: 0;
  color: var(--pri-fg);
  border-radius: 999px;
  font-size: 13.5px; font-weight: 500;
}
.m3-text:hover { background: var(--pri-soft); }

/* M3 switch */
.m3-switch {
  display: inline-block; position: relative;
  width: 52px; height: 32px;
  background: var(--bg-elev);
  border: 2px solid var(--line);
  border-radius: 999px;
  cursor: pointer;
  transition: background .18s, border-color .18s;
}
.m3-switch.on { background: var(--pri); border-color: var(--pri); }
.m3-thumb {
  position: absolute; left: 4px; top: 50%;
  transform: translateY(-50%);
  width: 16px; height: 16px;
  background: var(--text-2);
  border-radius: 50%;
  transition: left .18s, background .18s, width .18s, height .18s;
}
.m3-switch.on .m3-thumb { left: 26px; width: 20px; height: 20px; background: #fff; }

/* ── reports ── */
.reports { max-width: 880px; margin: 0 auto; }
.rp-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 8px 12px;
}
.rp-title { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.rp-title h2 { margin: 0; font-size: 16px; font-weight: 500; letter-spacing: -0.005em; color: var(--text); }
.rp-count { font-size: 12.5px; color: var(--text-3); font-family: var(--font-mono); }
.rp-today-pill {
  font-size: 11.5px; padding: 2px 10px; border-radius: 999px;
  background: var(--pri-soft); color: var(--pri-fg); font-weight: 500;
}
.rp-actions { display: flex; gap: 2px; }

.rp-empty {
  padding: 40px 16px;
  text-align: center;
  color: var(--text-2);
  background: var(--bg);
  border: 1px dashed var(--line);
  border-radius: var(--r-lg);
}
.rp-empty p { margin: 12px 0 0; font-size: 13.5px; }

/* timeline */
.timeline {
  display: flex; flex-direction: column; gap: 8px;
}
.paper {
  background: var(--bg);
  border: 1px solid var(--line-soft);
  border-radius: var(--r-md);
  overflow: hidden;
  transition: border-color .15s, box-shadow .15s;
}
.paper:hover { border-color: var(--line); }
.paper.open  { border-color: var(--pri); box-shadow: var(--shadow-1); }
.paper.failed { background: #fef7f6; border-color: rgba(217,48,37,0.25); }

.paper-row {
  width: 100%;
  display: flex; align-items: flex-start; gap: 14px;
  padding: 14px 16px;
  background: transparent; border: 0;
  text-align: left;
  cursor: pointer;
  transition: background .12s;
}
.paper-row:hover { background: var(--bg-hover); }

.paper-stamp {
  flex: none;
  width: 32px; height: 32px;
  display: grid; place-items: center;
  background: #e6f4ea; color: #137333;
  border-radius: 50%;
  margin-top: 2px;
}
.paper-stamp.err { background: #fce8e6; color: var(--bad); }

.paper-line { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.paper-line-top { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.paper-day { font-size: 13.5px; font-weight: 500; color: var(--text); }
.paper-clock { font-size: 12px; color: var(--text-3); font-family: var(--font-mono); }
.paper-tag {
  font-size: 10.5px; font-weight: 500; padding: 1px 8px;
  border-radius: 999px;
}
.paper-tag.err { background: #fce8e6; color: var(--bad); }
.paper-preview {
  font-size: 13px; color: var(--text-2);
  line-height: 1.5;
  overflow: hidden; text-overflow: ellipsis;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.paper-preview.err { color: var(--bad); }
.paper-chev {
  flex: none; color: var(--text-3);
  font-size: 22px; margin-top: 2px;
  transition: transform .18s;
}
.paper-chev.rot { transform: rotate(180deg); color: var(--pri); }

.paper-body-wrap {
  border-top: 1px dashed var(--line-soft);
  padding: 14px 18px 18px 60px;
}
.paper-body {
  margin: 0;
  font-family: 'Google Sans', 'Roboto', sans-serif;
  font-size: 14px; line-height: 1.75;
  color: var(--text);
  white-space: pre-wrap; word-break: break-word;
}
.paper-error { margin: 0; color: var(--bad); font-size: 13px; line-height: 1.55; }

/* icon-btn (本地复用主题) */
.icon-btn {
  width: 40px; height: 40px;
  display: grid; place-items: center;
  border: 0; background: transparent;
  color: var(--text-2);
  border-radius: 50%;
  transition: background .15s, color .15s;
}
.icon-btn:hover { background: var(--bg-elev); color: var(--text); }
.icon-btn.active { background: var(--pri-soft); color: var(--pri-fg); }

/* transitions */
.fade-enter-active, .fade-leave-active { transition: opacity .18s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.reveal-enter-active, .reveal-leave-active { transition: max-height .25s ease, opacity .2s; overflow: hidden; }
.reveal-enter-from, .reveal-leave-to { max-height: 0; opacity: 0; }
.reveal-enter-to, .reveal-leave-from { max-height: 1200px; opacity: 1; }

/* responsive */
@media (max-width: 720px) {
  .topbar { padding: 8px; height: 56px; }
  .brand .name { font-size: 17px; }
  .page { padding: 16px 14px 40px; }
  .masthead { padding: 20px 22px; gap: 14px; border-radius: var(--r-md); }
  .masthead::after { right: -40px; top: -40px; width: 160px; height: 160px; }
  .mast-title { font-size: 22px; }
  .mast-illust .msi { font-size: 44px; }
  .sc-head, .sc-foot { padding-left: 18px; padding-right: 18px; }
  .sc-topic { padding: 16px 18px 8px; }
  .sc-topic-text { font-size: 15px; }
  .sc-edit-head { padding: 18px 18px 4px; }
  .sc-edit-body { padding: 10px 18px 4px; }
  .sc-edit-foot { padding: 12px 16px 18px; }
  .field-row { flex-direction: column; align-items: stretch; gap: 12px; }
  .paper-body-wrap { padding-left: 18px; }
}
</style>
