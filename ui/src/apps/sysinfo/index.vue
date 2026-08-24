<script setup>
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue';
import * as api from '@/utils/api.js';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';

const loading = ref(false);
const errMsg = ref('');
const snap = ref(null);
const lastAt = ref(0);
let timer = null;

async function tick() {
  try {
    loading.value = !snap.value;
    snap.value = await api.get('/apps/sysinfo/snapshot');
    lastAt.value = Date.now();
    errMsg.value = '';
  } catch (e) { errMsg.value = '获取系统状态失败: ' + (e?.body?.error || e.message || e); }
  loading.value = false;
}
function start() { if (timer) return; tick(); timer = setInterval(tick, 5000); }
function stop()  { clearInterval(timer); timer = null; }

onMounted(start);
onActivated(start);
onDeactivated(stop);
onBeforeUnmount(stop);

const sinceText = ref('');
let sinceTimer = null;
onMounted(() => {
  sinceTimer = setInterval(() => {
    if (!lastAt.value) { sinceText.value = ''; return; }
    const s = Math.max(0, Math.round((Date.now() - lastAt.value) / 1000));
    sinceText.value = s < 2 ? '刚刚' : `${s}s 前`;
  }, 500);
});
onBeforeUnmount(() => clearInterval(sinceTimer));

function pct(x) { return Math.round((x || 0) * 100); }
function gb(b) { return ((b || 0) / (1024 ** 3)).toFixed(1) + ' GB'; }
function fmtUptime(s) {
  if (!s) return '';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return [d && `${d} 天`, h && `${h} 小时`, `${m} 分`].filter(Boolean).join(' ');
}

// Ring 周长 (r=42): 2 * π * 42
const RING_C = 263.89;
function ringOffset(usage) { return RING_C * (1 - (usage || 0)); }

const cpuUsage = computed(() => snap.value?.cpu?.usage || 0);
const memUsage = computed(() => snap.value?.mem?.usage || 0);

function loadColor(load, cores) {
  const ratio = load / Math.max(1, cores);
  if (ratio < 0.7) return 'good';
  if (ratio < 1.2) return 'warn';
  return 'bad';
}
</script>

<template>
  <div class="app-frame">
    <header class="topbar">
      <span class="left-spacer"></span>
      <div class="brand"><span class="name">系统状态</span></div>
      <div class="right">
        <ChatTrigger />
        <AppsTrigger />
      </div>
    </header>
    <section class="page">
    <div v-if="errMsg" class="err-bar">{{ errMsg }}</div>
    <div v-if="loading && !snap" class="placeholder">读取中…</div>

    <template v-if="snap">
      <!-- ─── 顶部主机卡 ─── -->
      <header class="card head">
        <div>
          <div class="crumb">系统状态</div>
          <div class="hostname">{{ snap.sys?.hostname || '本机' }}</div>
          <div class="meta">
            <span>{{ snap.sys?.platform }} · {{ snap.sys?.arch }}</span>
            <span>·</span>
            <span>内核 {{ snap.sys?.release }}</span>
            <span>·</span>
            <span>Node {{ snap.sys?.nodeVersion }}</span>
          </div>
        </div>
        <div class="up-block">
          <div class="up-chip">
            <span class="msi xxs">schedule</span>
            <span>{{ fmtUptime(snap.sys?.uptime) }}</span>
          </div>
          <div class="since">{{ sinceText ? '更新于 ' + sinceText : '' }}</div>
        </div>
      </header>

      <!-- ─── CPU / 内存 环 ─── -->
      <div class="ring-grid">
        <article class="card ring-card">
          <div class="ring-wrap">
            <svg class="ring-svg" viewBox="0 0 100 100">
              <circle class="ring-bg"  cx="50" cy="50" r="42" />
              <circle class="ring-fg cpu" cx="50" cy="50" r="42"
                :stroke-dasharray="RING_C"
                :stroke-dashoffset="ringOffset(cpuUsage)" />
            </svg>
            <div class="ring-center">
              <div class="big">{{ pct(cpuUsage) }}<span class="u">%</span></div>
              <div class="lbl">CPU</div>
            </div>
          </div>
          <div class="kv-list">
            <div class="kv"><span>核心</span><span>{{ snap.cpu?.cores }} 核</span></div>
            <div class="kv">
              <span>负载 1m / 5m / 15m</span>
              <span :class="'tone-' + loadColor(snap.sys?.loadavg?.[0] || 0, snap.cpu?.cores || 1)">
                {{ snap.sys?.loadavg?.map((n) => n.toFixed(2)).join(' / ') }}
              </span>
            </div>
            <div class="kv model" :title="snap.cpu?.model"><span>型号</span><span>{{ snap.cpu?.model }}</span></div>
          </div>
        </article>

        <article class="card ring-card">
          <div class="ring-wrap">
            <svg class="ring-svg" viewBox="0 0 100 100">
              <circle class="ring-bg"  cx="50" cy="50" r="42" />
              <circle class="ring-fg mem" cx="50" cy="50" r="42"
                :stroke-dasharray="RING_C"
                :stroke-dashoffset="ringOffset(memUsage)" />
            </svg>
            <div class="ring-center">
              <div class="big">{{ pct(memUsage) }}<span class="u">%</span></div>
              <div class="lbl">内存</div>
            </div>
          </div>
          <div class="kv-list">
            <div class="kv"><span>已用</span><span>{{ gb(snap.mem?.used) }}</span></div>
            <div class="kv"><span>空闲</span><span>{{ gb(snap.mem?.free) }}</span></div>
            <div class="kv"><span>总计</span><span>{{ gb(snap.mem?.total) }}</span></div>
          </div>
        </article>
      </div>

      <!-- ─── 磁盘 ─── -->
      <article class="card">
        <header class="sec-head">
          <div>
            <div class="sec-title">磁盘</div>
            <div class="sec-sub">本机各挂载点的使用情况。</div>
          </div>
        </header>
        <div class="disk-list">
          <div v-for="d in snap.disk" :key="d.mountPoint" class="disk-row">
            <div class="d-top">
              <span class="d-mount">{{ d.mountPoint }}</span>
              <span class="d-fs">{{ d.filesystem }}</span>
              <span class="d-cap">
                <strong :class="d.capacity > 0.9 ? 'tone-bad' : (d.capacity > 0.75 ? 'tone-warn' : 'tone-mute')">
                  {{ pct(d.capacity) }}%
                </strong>
                · {{ gb(d.used) }} / {{ gb(d.total) }}
              </span>
            </div>
            <div class="bar"><div class="fill"
              :class="d.capacity > 0.9 ? 'bad' : (d.capacity > 0.75 ? 'warn' : 'ok')"
              :style="{ width: pct(d.capacity) + '%' }"></div></div>
          </div>
        </div>
      </article>

      <!-- ─── 进程 ─── -->
      <article class="card">
        <header class="sec-head">
          <div>
            <div class="sec-title">进程</div>
            <div class="sec-sub">按 CPU 占用排序的前 20 个进程。</div>
          </div>
        </header>
        <div class="proc">
          <div class="proc-row head">
            <span>PID</span><span>CPU%</span><span>内存%</span><span>用户</span><span>命令</span>
          </div>
          <div v-for="p in snap.processes" :key="p.pid" class="proc-row">
            <span class="num">{{ p.pid }}</span>
            <span class="num">
              <span class="bar-mini"><span :style="{ width: Math.min(100, p.cpu) + '%' }"></span></span>
              {{ p.cpu.toFixed(1) }}
            </span>
            <span class="num">{{ p.mem.toFixed(1) }}</span>
            <span class="user">{{ p.user }}</span>
            <span class="cmd" :title="p.command">{{ p.command }}</span>
          </div>
        </div>
      </article>
    </template>
  </section>
  </div>
</template>

<style scoped>
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

.page {
  flex: 1; min-width: 0; min-height: 0;
  overflow-y: auto;
  padding: 24px 32px 60px;
  background: #f7f9fc;
}

.err-bar { padding: 10px 14px; background: #fce8e6; color: var(--bad); border-radius: 10px; font-size: 13px; margin-bottom: 14px; max-width: 1100px; }
.placeholder { color: var(--text-3); padding: 60px; text-align: center; }

/* ── 通用 card / sec-head ── */
.card {
  background: #fff;
  border-radius: 16px;
  padding: 22px 24px;
  margin: 0 auto 14px;
  max-width: 1100px;
  box-shadow: 0 1px 2px rgba(60,64,67,0.06), 0 4px 12px rgba(60,64,67,0.04);
}
.sec-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.sec-title { font-size: 15.5px; font-weight: 500; letter-spacing: -0.005em; }
.sec-sub { font-size: 12.5px; color: var(--text-2); margin-top: 4px; line-height: 1.55; }

/* ── 顶部主机卡 ── */
.head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.crumb { font-size: 11.5px; color: var(--text-3); letter-spacing: 0.04em; }
.hostname { margin-top: 4px; font-size: 26px; font-weight: 500; letter-spacing: -0.015em; }
.meta { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 8px; font-size: 12.5px; color: var(--text-2); }

.up-block { text-align: right; }
.up-chip {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--accent-soft); color: var(--accent-fg);
  padding: 6px 12px; border-radius: 999px;
  font-size: 12.5px; font-weight: 500;
}
.since { font-size: 11px; color: var(--text-3); margin-top: 6px; }

/* ── CPU / 内存 环卡 ── */
.ring-grid {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 12px; max-width: 1100px; margin: 0 auto 14px;
}
.ring-card {
  margin: 0;
  display: flex; align-items: center; gap: 24px;
}
.ring-wrap {
  flex: none;
  position: relative;
  width: 140px; height: 140px;
  border: 0; outline: 0;
}
.ring-svg {
  display: block;
  width: 100%; height: 100%;
  transform: rotate(-90deg);
  border: 0; outline: 0;
  overflow: visible;
}
.ring-bg { fill: none; stroke: #e8eaed; stroke-width: 8; }
.ring-fg { fill: none; stroke-width: 8; stroke-linecap: round;
  transition: stroke-dashoffset .6s cubic-bezier(.4,0,.2,1); }
.ring-fg.cpu { stroke: var(--accent); }
.ring-fg.mem { stroke: #9334e6; }
.ring-center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.ring-center .big { font-size: 30px; font-weight: 500; line-height: 1.05; letter-spacing: -0.02em; }
.ring-center .big .u { font-size: 16px; color: var(--text-3); margin-left: 2px; }
.ring-center .lbl { font-size: 11px; color: var(--text-3); letter-spacing: 0.06em; text-transform: uppercase; margin-top: 2px; }

.kv-list { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.kv {
  display: flex; justify-content: space-between; gap: 12px;
  padding: 6px 0; border-bottom: 1px solid var(--line-soft);
  font-size: 12.5px;
}
.kv:last-child { border-bottom: 0; }
.kv span:first-child { color: var(--text-2); }
.kv span:last-child { color: var(--text); font-variant-numeric: tabular-nums; text-align: right; }
.kv.model span:last-child {
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  font-size: 11.5px; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.tone-good { color: var(--good); }
.tone-warn { color: var(--warn); }
.tone-bad  { color: var(--bad); }
.tone-mute { color: var(--text-2); }

/* ── 磁盘 ── */
.disk-list { display: flex; flex-direction: column; gap: 14px; }
.disk-row { }
.d-top { display: flex; align-items: baseline; gap: 12px; font-size: 12.5px; margin-bottom: 6px; }
.d-mount { font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-weight: 500; }
.d-fs { color: var(--text-3); font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 11.5px; }
.d-cap { margin-left: auto; color: var(--text-2); font-variant-numeric: tabular-nums; }
.d-cap strong { font-weight: 500; }
.bar { background: var(--bg-elev); border-radius: 999px; height: 6px; overflow: hidden; }
.fill { height: 100%; border-radius: 999px; transition: width .4s; }
.fill.ok   { background: var(--accent); }
.fill.warn { background: var(--warn); }
.fill.bad  { background: var(--bad); }

/* ── 进程表 ── */
.proc { display: flex; flex-direction: column; }
.proc-row {
  display: grid; grid-template-columns: 80px 130px 80px 100px minmax(0, 1fr);
  align-items: center; gap: 8px;
  padding: 7px 4px;
  border-bottom: 1px solid var(--line-soft);
  font-size: 12.5px;
  border-radius: 6px;
  transition: background .12s;
}
.proc-row:hover:not(.head) { background: var(--bg-hover); }
.proc-row.head {
  color: var(--text-3); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
  border-bottom: 0; padding-bottom: 4px;
}
.num { font-variant-numeric: tabular-nums; display: inline-flex; align-items: center; gap: 8px; }
.user { color: var(--text-2); }
.cmd {
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text);
}
.bar-mini {
  display: inline-block; width: 60px; height: 4px;
  background: var(--bg-elev); border-radius: 2px; overflow: hidden;
}
.bar-mini > span {
  display: block; height: 100%;
  background: var(--accent);
  border-radius: 2px;
}

@media (max-width: 760px) {
  .page { padding: 16px 14px 40px; }
  .head { flex-direction: column; }
  .up-block { text-align: left; }
  .ring-grid { grid-template-columns: 1fr; }
  .ring-card { flex-direction: column; align-items: stretch; }
  .ring-wrap { margin: 0 auto; }
  .proc-row { grid-template-columns: 60px 100px 60px 80px minmax(0, 1fr); font-size: 12px; }
}
</style>
