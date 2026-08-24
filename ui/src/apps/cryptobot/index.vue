<script setup>
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue';
import * as api from '@/utils/api.js';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';

// ── 主状态 ──
const agent = ref(null);
const decisions = ref([]);
const positions = ref(null);
const orders = ref(null);
const ordersFilter = ref('ANY');

const loading = ref(false);
const errMsg = ref('');
const notice = ref({ kind: '', text: '' });
let noticeTimer = null;
function flash(kind, text, ms = 2200) {
  notice.value = { kind, text };
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => notice.value = { kind: '', text: '' }, ms);
}

// ── tabs ──
const tabs = [
  { key: 'overview',  label: '概览',   icon: 'dashboard' },
  { key: 'positions', label: '持仓',   icon: 'account_balance_wallet' },
  { key: 'orders',    label: '订单',   icon: 'receipt_long' },
  { key: 'decisions', label: '决策',   icon: 'auto_awesome' },
  { key: 'settings',  label: '设置',   icon: 'tune' }
];
const active = ref('overview');

// ── 加载 ──
async function loadAgent() {
  try {
    const a = await api.get('/apps/cryptobot/agent');
    agent.value = a;
  } catch (e) { errMsg.value = '获取 agent 状态失败: ' + (e?.body?.message || e.message || e); }
}
async function loadDecisions() {
  try {
    const r = await api.get('/apps/cryptobot/decision/records', { query: { limit: 50 } });
    decisions.value = r?.items || [];
  } catch (e) { decisions.value = []; }
}
async function loadPositions() {
  if (!agent.value?.config?.has_keys) return;
  try {
    const r = await api.get('/apps/cryptobot/positions');
    positions.value = r;
  } catch (e) { positions.value = { success: false, message: e.message }; }
}
async function loadOrders() {
  if (!agent.value?.config?.has_keys) return;
  try {
    const r = await api.get('/apps/cryptobot/trade/orders', { query: { instType: ordersFilter.value, limit: 50 } });
    orders.value = r;
  } catch (e) { orders.value = { success: false, message: e.message }; }
}

async function loadAll() {
  loading.value = true;
  await loadAgent();
  await loadDecisions();
  loading.value = false;
}

// 切 tab 时按需拉
watch(active, (k) => {
  if (k === 'positions' && !positions.value) loadPositions();
  if (k === 'orders' && !orders.value) loadOrders();
  if (k === 'decisions' && !decisions.value.length) loadDecisions();
});
watch(ordersFilter, () => loadOrders());

// 自动轮询(running 时,每 5s)
let pollTimer = null;
watch(() => agent.value?.state?.running, (run) => {
  clearInterval(pollTimer); pollTimer = null;
  if (run) pollTimer = setInterval(() => { loadAgent(); if (active.value === 'decisions') loadDecisions(); }, 5000);
});

// ── 启停 ──
const busy = ref(false);
async function startBot() {
  busy.value = true;
  try { await api.post('/apps/cryptobot/agent/start', {}); await loadAgent(); flash('ok', '已启动'); }
  catch (e) { flash('err', '启动失败: ' + (e?.body?.message || e.message || e)); }
  busy.value = false;
}
async function stopBot() {
  busy.value = true;
  try { await api.post('/apps/cryptobot/agent/stop', {}); await loadAgent(); flash('ok', '已停止'); }
  catch (e) { flash('err', '停止失败: ' + (e?.body?.message || e.message || e)); }
  busy.value = false;
}

// ── 设置 ──
const cfgDraft = ref({ api_key: '', api_secret: '', passphrase: '', goal: '' });
const cfgSaving = ref(false);
const cfgTesting = ref(false);
const cfgTestMsg = ref({ kind: '', text: '' });

watch(() => agent.value?.config, (c) => {
  if (!c) return;
  cfgDraft.value = {
    api_key: c.api_key || '',
    api_secret: c.api_secret || '',
    passphrase: c.passphrase || '',
    goal: c.goal || ''
  };
}, { immediate: true });

async function saveConfig() {
  cfgSaving.value = true;
  try {
    await api.post('/apps/cryptobot/agent', cfgDraft.value);
    await loadAgent();
    flash('ok', '设置已保存');
  } catch (e) { flash('err', '保存失败: ' + (e?.body?.message || e.message || e)); }
  cfgSaving.value = false;
}
async function testExchange() {
  cfgTesting.value = true;
  cfgTestMsg.value = { kind: '', text: '' };
  try {
    const r = await api.post('/apps/cryptobot/agent/exchange/test', cfgDraft.value);
    cfgTestMsg.value = r?.success ? { kind: 'ok', text: '连接成功 ✓' } : { kind: 'err', text: r?.message || '连接失败' };
  } catch (e) { cfgTestMsg.value = { kind: 'err', text: e?.body?.message || e.message || '连接失败' }; }
  cfgTesting.value = false;
}

// ── 计算 ──
const eqPnl = computed(() => agent.value?.equity?.pnl || 0);
const eqPnlRatio = computed(() => (agent.value?.equity?.pnl_ratio || 0) * 100);
const todayChange = computed(() => agent.value?.equity?.today_change || 0);
const recentDecisions = computed(() => decisions.value.slice(0, 5));
const overviewKpis = computed(() => ([
  { label: '持仓数', value: positions.value?.positions?.length ?? '—', icon: 'account_balance_wallet' },
  { label: '今日决策', value: decisions.value.filter((d) => isToday(d.created_at)).length, icon: 'auto_awesome' },
  { label: '最近运行', value: relTime(agent.value?.state?.last_run_at), icon: 'timer' },
  { label: '采样间隔', value: (agent.value?.config?.interval_sec || '—') + 's', icon: 'tune' }
]));

function isToday(ts) {
  if (!ts) return false;
  const d = new Date(ts);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}
function relTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  const diffSec = (Date.now() - d.getTime()) / 1000;
  if (diffSec < 60) return Math.round(diffSec) + 's 前';
  if (diffSec < 3600) return Math.round(diffSec / 60) + ' 分前';
  if (diffSec < 86400) return Math.round(diffSec / 3600) + ' 小时前';
  return Math.round(diffSec / 86400) + ' 天前';
}
function fmtMoney(v, sign = false) {
  const n = Number(v) || 0;
  const s = sign && n > 0 ? '+' : '';
  return s + '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(v) {
  const n = Number(v) || 0;
  return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
}
function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(typeof ts === 'string' ? ts : Number(ts));
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return '今天 ' + d.toTimeString().slice(0, 5);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.toTimeString().slice(0, 5)}`;
}
function num(v, digits = 4) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

// OKX position 字段映射
function posSize(p) { return num(p.pos, 4); }
function posSide(p) {
  const ps = String(p.posSide || '').toLowerCase();
  if (ps === 'long' || ps === 'net' && Number(p.pos) > 0) return 'long';
  if (ps === 'short' || ps === 'net' && Number(p.pos) < 0) return 'short';
  return 'net';
}
function posUpl(p) { return Number(p.upl) || 0; }
function posUplRatio(p) { return (Number(p.uplRatio) || 0) * 100; }

// OKX order 状态着色
const ORDER_STATE = {
  filled:    { label: '已成交', cls: 'success' },
  partially_filled: { label: '部分', cls: 'pending' },
  live:      { label: '挂单中', cls: 'running' },
  canceled:  { label: '已撤单', cls: 'mute' }
};
function orderStateMeta(s) {
  return ORDER_STATE[String(s || '').toLowerCase()] || { label: s || '?', cls: 'mute' };
}

onMounted(loadAll);
onActivated(loadAll);
onDeactivated(() => { clearInterval(pollTimer); pollTimer = null; });
onBeforeUnmount(() => { clearInterval(pollTimer); pollTimer = null; });
</script>

<template>
  <div class="app-frame crypto-frame">
    <header class="topbar">
      <span class="left-spacer"></span>
      <div class="brand"><span class="name">炒币机</span></div>
      <div class="right">
        <ChatTrigger />
        <AppsTrigger />
      </div>
    </header>
    <section class="page">
    <!-- ─── 顶部 brand + 状态 + 启停 ─── -->
    <header class="card head-card">
      <div class="brand">
        <div class="logo">₿</div>
        <div class="brand-text">
          <h1>炒币机</h1>
          <div class="sub">
            OKX 自动交易 · 上次运行 {{ relTime(agent?.state?.last_run_at) }}
            <template v-if="agent?.state?.last_error_at">
              · <span class="tone-bad">最近错误 {{ relTime(agent?.state?.last_error_at) }}</span>
            </template>
          </div>
        </div>
      </div>
      <div class="head-right">
        <span class="status-pill" :class="agent?.state?.running ? 'on' : 'off'">
          <span class="dot" :class="{ pulse: agent?.state?.running }"></span>
          {{ agent?.state?.running ? (agent?.state?.executing ? '执行中' : '运行中') : '已停止' }}
        </span>
        <button v-if="agent?.state?.running" class="btn outline danger" @click="stopBot" :disabled="busy">
          <span class="msi xxs">stop</span> 暂停
        </button>
        <button v-else class="btn solid" @click="startBot" :disabled="busy || !agent?.config?.has_keys">
          <span class="msi xxs">play_arrow</span> 启动
        </button>
        <Transition name="fade">
          <span v-if="notice.text" class="notice" :class="notice.kind">{{ notice.text }}</span>
        </Transition>
      </div>
    </header>

    <div v-if="errMsg" class="err-bar">{{ errMsg }}</div>

    <!-- 没配 API key 的引导 -->
    <article v-if="agent && !agent.config.has_keys" class="card onboard">
      <div class="ob-icon"><span class="msi" style="font-size:36px;color:var(--accent)">vpn_key</span></div>
      <div class="ob-text">
        <div class="ob-title">还没配置 OKX API</div>
        <div class="ob-sub">炒币机需要你提供 OKX 的 API Key / Secret / Passphrase 才能读取行情、下单和管理仓位。</div>
      </div>
      <button class="btn solid" @click="active = 'settings'">去设置 →</button>
    </article>

    <!-- ─── 净值大卡 ─── -->
    <article v-if="agent" class="card equity-card">
      <div class="eq-l">
        <div class="lbl">账户净值</div>
        <div class="big">{{ fmtMoney(agent.equity?.current) }}</div>
        <div class="meta-row">
          <span class="pnl-pill" :class="eqPnl >= 0 ? 'pos' : 'neg'">
            <span class="msi xxs">{{ eqPnl >= 0 ? 'trending_up' : 'trending_down' }}</span>
            {{ fmtPct(eqPnlRatio) }} · {{ fmtMoney(eqPnl, true) }}
          </span>
          <span class="dim">初始 {{ fmtMoney(agent.equity?.initial) }}</span>
          <span class="dim today" v-if="todayChange !== 0">
            今日 <strong :class="todayChange >= 0 ? 'tone-good' : 'tone-bad'">{{ fmtMoney(todayChange, true) }}</strong>
          </span>
        </div>
      </div>
      <svg viewBox="0 0 200 64" class="spark" v-if="agent.equity?.current">
        <defs>
          <linearGradient :id="'sg-' + (eqPnl >= 0 ? 'pos' : 'neg')" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="eqPnl >= 0 ? '#34a853' : '#d93025'" stop-opacity="0.18"/>
            <stop offset="100%" :stop-color="eqPnl >= 0 ? '#34a853' : '#d93025'" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polyline
          :points="eqPnl >= 0
            ? '0,52 22,48 44,50 66,38 88,42 110,30 132,32 154,22 176,18 200,10'
            : '0,12 22,18 44,16 66,28 88,24 110,38 132,34 154,46 176,50 200,58'"
          fill="none" :stroke="eqPnl >= 0 ? '#34a853' : '#d93025'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline
          :points="(eqPnl >= 0
            ? '0,52 22,48 44,50 66,38 88,42 110,30 132,32 154,22 176,18 200,10'
            : '0,12 22,18 44,16 66,28 88,24 110,38 132,34 154,46 176,50 200,58') + ' 200,64 0,64'"
          :fill="'url(#sg-' + (eqPnl >= 0 ? 'pos' : 'neg') + ')'"/>
      </svg>
    </article>

    <!-- ─── tab nav ─── -->
    <nav class="tabs" v-if="agent">
      <button v-for="t in tabs" :key="t.key"
        class="tab" :class="{ active: active === t.key }" @click="active = t.key">
        <span class="msi xs">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
      </button>
    </nav>

    <!-- ━━━━━ 概览 ━━━━━ -->
    <template v-if="agent && active === 'overview'">
      <div class="kpi-grid">
        <div v-for="k in overviewKpis" :key="k.label" class="kpi card">
          <span class="msi sm kic">{{ k.icon }}</span>
          <div class="kv">
            <div class="kl">{{ k.label }}</div>
            <div class="kn">{{ k.value }}</div>
          </div>
        </div>
      </div>

      <article class="card">
        <header class="sec-head">
          <div>
            <div class="sec-title">最近决策</div>
            <div class="sec-sub">AI 每个采样周期都会输出一段操作意图。</div>
          </div>
          <button class="btn small ghost" @click="active = 'decisions'">查看全部 →</button>
        </header>
        <div v-if="!recentDecisions.length" class="empty-mini">暂无决策</div>
        <div v-else class="dec-list">
          <article v-for="d in recentDecisions" :key="d.id" class="dec">
            <span class="dec-dot" :class="d.ok ? 'ok' : 'bad'"></span>
            <div class="dec-body">
              <div class="dec-t">{{ d.summary || (d.ok ? '(无摘要)' : (d.error || '失败')) }}</div>
              <div class="dec-m">
                <span class="mono">#{{ d.id }}</span>
                <span v-if="d.task_id">· task #{{ d.task_id }}</span>
                <span class="time">{{ fmtTime(d.created_at) }}</span>
              </div>
            </div>
          </article>
        </div>
      </article>
    </template>

    <!-- ━━━━━ 持仓 ━━━━━ -->
    <template v-if="agent && active === 'positions'">
      <article class="card">
        <header class="sec-head">
          <div>
            <div class="sec-title">持仓</div>
            <div class="sec-sub">来自 OKX 实时账户。{{ positions?.balances?.totalEq ? '总权益: $' + Number(positions.balances.totalEq).toLocaleString() : '' }}</div>
          </div>
          <button class="btn small ghost" @click="loadPositions">
            <span class="msi xxs">refresh</span> 刷新
          </button>
        </header>
        <div v-if="!positions" class="empty-mini">读取中…</div>
        <div v-else-if="positions.success === false" class="err-inline">{{ positions.message }}</div>
        <div v-else-if="positions.positionsError" class="err-inline">{{ positions.positionsError }}</div>
        <div v-else-if="!positions.positions?.length" class="empty-mini">当前无持仓</div>
        <div v-else class="t-table">
          <div class="tr head">
            <div>合约</div><div>方向</div><div class="num">仓位</div>
            <div class="num">开仓价</div><div class="num">标记价</div><div class="num">未实现盈亏</div><div class="num">杠杆</div>
          </div>
          <div v-for="p in positions.positions" :key="p.instId + '/' + p.posSide" class="tr">
            <div class="mono inst">{{ p.instId }}</div>
            <div><span class="side" :class="posSide(p)">{{ posSide(p) === 'long' ? '多' : (posSide(p) === 'short' ? '空' : '净') }}</span></div>
            <div class="num mono">{{ posSize(p) }}</div>
            <div class="num mono dim">{{ num(p.avgPx, 6) }}</div>
            <div class="num mono">{{ num(p.markPx, 6) }}</div>
            <div class="num mono" :class="posUpl(p) >= 0 ? 'tone-good' : 'tone-bad'">
              {{ fmtMoney(posUpl(p), true) }}
              <span class="ratio">{{ fmtPct(posUplRatio(p)) }}</span>
            </div>
            <div class="num mono dim">{{ p.lever || '—' }}x</div>
          </div>
        </div>
      </article>
    </template>

    <!-- ━━━━━ 订单 ━━━━━ -->
    <template v-if="agent && active === 'orders'">
      <article class="card">
        <header class="sec-head">
          <div>
            <div class="sec-title">订单历史</div>
            <div class="sec-sub">最近 50 条来自 OKX。</div>
          </div>
          <div class="head-tools">
            <select class="text-input select small" v-model="ordersFilter">
              <option value="ANY">全部类型</option>
              <option value="SPOT">现货</option>
              <option value="SWAP">永续</option>
              <option value="FUTURES">交割</option>
              <option value="MARGIN">杠杆</option>
            </select>
            <button class="btn small ghost" @click="loadOrders">
              <span class="msi xxs">refresh</span>
            </button>
          </div>
        </header>
        <div v-if="!orders" class="empty-mini">读取中…</div>
        <div v-else-if="orders.success === false" class="err-inline">{{ orders.message }}</div>
        <div v-else-if="!orders.items?.length" class="empty-mini">无订单记录</div>
        <div v-else class="t-table orders">
          <div class="tr head">
            <div>合约 · 类型</div><div>方向</div><div class="num">数量</div>
            <div class="num">均价</div><div>状态</div><div class="num">PnL</div><div class="num">时间</div>
          </div>
          <div v-for="o in orders.items" :key="o.ordId || (o.instId + o.cTime)" class="tr">
            <div class="mono inst">
              {{ o.instId }}
              <span class="t-tag">{{ o.instType }}</span>
            </div>
            <div><span class="side" :class="(o.side || '').toLowerCase() === 'buy' ? 'long' : 'short'">
              {{ (o.side || '').toUpperCase() }}
            </span></div>
            <div class="num mono">{{ num(o.fillSz || o.sz, 4) }}</div>
            <div class="num mono dim">{{ num(o.avgPx || o.px, 6) }}</div>
            <div><span class="badge" :class="orderStateMeta(o.state).cls">{{ orderStateMeta(o.state).label }}</span></div>
            <div class="num mono" :class="(Number(o.pnl) || 0) >= 0 ? 'tone-good' : 'tone-bad'">
              {{ Number(o.pnl) ? fmtMoney(Number(o.pnl), true) : '—' }}
            </div>
            <div class="num mono dim time-cell">{{ fmtTime(o.cTime) }}</div>
          </div>
        </div>
      </article>
    </template>

    <!-- ━━━━━ 决策 ━━━━━ -->
    <template v-if="agent && active === 'decisions'">
      <article class="card">
        <header class="sec-head">
          <div>
            <div class="sec-title">决策记录</div>
            <div class="sec-sub">每次采样后 AI 输出的操作意图与结果。</div>
          </div>
          <button class="btn small ghost" @click="loadDecisions">
            <span class="msi xxs">refresh</span> 刷新
          </button>
        </header>
        <div v-if="!decisions.length" class="empty-mini">还没有决策</div>
        <div v-else class="dec-list">
          <article v-for="d in decisions" :key="d.id" class="dec full">
            <span class="dec-dot" :class="d.ok ? 'ok' : 'bad'"></span>
            <div class="dec-body">
              <div class="dec-t">{{ d.summary || (d.ok ? '(无摘要)' : '失败') }}</div>
              <pre v-if="d.error" class="dec-err">{{ d.error }}</pre>
              <div class="dec-m">
                <span class="mono">#{{ d.id }}</span>
                <span v-if="d.task_id">· task #{{ d.task_id }}</span>
                <span class="time">{{ fmtTime(d.created_at) }}</span>
              </div>
            </div>
          </article>
        </div>
      </article>
    </template>

    <!-- ━━━━━ 设置 ━━━━━ -->
    <template v-if="agent && active === 'settings'">
      <article class="card">
        <header class="sec-head">
          <div>
            <div class="sec-title">OKX API</div>
            <div class="sec-sub">在 OKX 网站创建只读+交易权限的 API Key。Passphrase 是创建 Key 时设置的密语,不是登录密码。</div>
          </div>
          <a class="btn small ghost" href="https://www.okx.com/account/my-api" target="_blank" rel="noopener">
            <span class="msi xxs">open_in_new</span> OKX 后台
          </a>
        </header>
        <div class="form">
          <div class="row">
            <label>API Key</label>
            <input class="text-input mono" v-model="cfgDraft.api_key" spellcheck="false" />
          </div>
          <div class="row">
            <label>API Secret</label>
            <input class="text-input mono" type="password" v-model="cfgDraft.api_secret" spellcheck="false" />
          </div>
          <div class="row">
            <label>Passphrase</label>
            <input class="text-input mono" type="password" v-model="cfgDraft.passphrase" spellcheck="false" />
          </div>
          <div class="actions">
            <span v-if="cfgTestMsg.text" class="inline-msg" :class="cfgTestMsg.kind">{{ cfgTestMsg.text }}</span>
            <button class="btn outline" :disabled="cfgTesting || !cfgDraft.api_key" @click="testExchange">
              <span class="msi xxs">cable</span> {{ cfgTesting ? '测试中…' : '测试连接' }}
            </button>
            <button class="btn solid" :disabled="cfgSaving" @click="saveConfig">
              {{ cfgSaving ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </article>

      <article class="card">
        <header class="sec-head">
          <div>
            <div class="sec-title">策略目标</div>
            <div class="sec-sub">用自然语言描述你希望机器人怎么交易,会拼到 system prompt 里。</div>
          </div>
        </header>
        <div class="form">
          <textarea class="text-input area" rows="6" v-model="cfgDraft.goal"
            placeholder="例如:24h 内净值波动控制在 ±2%,杠杆不超过 3x,优先做主流币的趋势跟踪。"></textarea>
          <div class="actions">
            <button class="btn solid" :disabled="cfgSaving" @click="saveConfig">保存目标</button>
          </div>
        </div>
      </article>

      <article class="card">
        <header class="sec-head">
          <div>
            <div class="sec-title">运行状态</div>
          </div>
        </header>
        <div class="kvs">
          <div class="kv"><span>Base URL</span><code>{{ agent.config.base_url || 'https://www.okx.com' }}</code></div>
          <div class="kv"><span>采样间隔</span><span>{{ agent.config.interval_sec }} 秒</span></div>
          <div class="kv"><span>已运行</span><span>{{ agent.state.running ? '是' : '否' }}</span></div>
          <div class="kv"><span>累计 tick</span><span>{{ agent.state.tick_count }}</span></div>
          <div class="kv"><span>启动时间</span><span>{{ fmtTime(agent.state.started_at) || '—' }}</span></div>
          <div class="kv"><span>最近运行</span><span>{{ fmtTime(agent.state.last_run_at) || '—' }}</span></div>
          <div v-if="agent.state.last_error" class="kv full">
            <span>最近错误</span>
            <pre class="err-mono">{{ agent.state.last_error }}</pre>
          </div>
        </div>
      </article>
    </template>
  </section>
  </div>
</template>

<style scoped>
/* ═════════════════════════════════════════════════════════
   交易所深色主题(scoped,只影响炒币机)
   ═════════════════════════════════════════════════════════ */

/* 自有顶栏 —— 深底,匹配整体黑色终端风 */
.crypto-frame { background: #0b0e15; }
.topbar {
  flex: none; height: 64px;
  display: flex; align-items: center;
  padding: 8px 16px;
  background: #0b0e15;
  border-bottom: 1px solid #23262f;
  color: #eef0f5;
}
.left-spacer { width: 8px; }
.topbar .brand { flex: 1; min-width: 0; margin: 0 4px 0 12px; }
.topbar .brand .name {
  font-size: 18px; font-weight: 600; letter-spacing: 0.02em;
  color: #eef0f5;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
}
.topbar .right { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.topbar :deep(.icon-btn) { color: #a0a4b3; }
.topbar :deep(.icon-btn:hover) { background: rgba(255,255,255,0.06); color: #eef0f5; }
.topbar :deep(.icon-btn.active) { background: rgba(240,185,11,0.15); color: #f0b90b; }
@media (max-width: 720px) {
  .topbar { padding: 8px; height: 56px; }
  .topbar .brand .name { font-size: 16px; }
}

.page {
  flex: 1; min-width: 0; min-height: 0;
  overflow-y: auto;
  padding: 16px 20px 60px;
  background:
    radial-gradient(1200px 600px at 80% -10%, rgba(240,185,11,0.06), transparent 60%),
    radial-gradient(900px 500px at 0% 110%, rgba(14,203,129,0.04), transparent 60%),
    #0b0e15;
  color: #eef0f5;
  font-feature-settings: "tnum" 1;

  --c-card:     #13161f;
  --c-card-hi:  #1a1e2a;
  --c-line:     #23262f;
  --c-line-soft:#1a1d29;
  --c-text:     #eef0f5;
  --c-text-2:   #a0a4b3;
  --c-text-3:   #6c7180;
  --c-gold:     #f0b90b;
  --c-gold-hi:  #fcd535;
  --c-bull:     #0ecb81;
  --c-bear:     #f6465d;
  --c-bull-soft:rgba(14,203,129,0.14);
  --c-bear-soft:rgba(246,70,93,0.14);
}

/* ─── 通用 card ─── */
.card {
  background: var(--c-card);
  border: 1px solid var(--c-line);
  border-radius: 12px;
  padding: 18px 20px;
  margin: 0 auto 12px;
  max-width: 1180px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.03),
    0 1px 2px rgba(0,0,0,0.4),
    0 6px 20px rgba(0,0,0,0.25);
}
.sec-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.sec-title { font-size: 14px; font-weight: 600; letter-spacing: 0.02em; color: var(--c-text); text-transform: uppercase; }
.sec-sub { font-size: 12px; color: var(--c-text-3); margin-top: 4px; line-height: 1.55; max-width: 540px; text-transform: none; letter-spacing: 0; font-weight: 400; }
.head-tools { display: flex; align-items: center; gap: 6px; }

.err-bar { padding: 10px 14px; background: var(--c-bear-soft); border: 1px solid var(--c-bear); color: var(--c-bear); border-radius: 8px; font-size: 12.5px; margin: 0 auto 12px; max-width: 1180px; }
.err-inline { padding: 12px; background: rgba(246,70,93,0.06); border: 1px solid var(--c-bear); color: var(--c-bear); border-radius: 8px; font-size: 12.5px; }

/* ─── header card ─── */
.head-card {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  background: linear-gradient(180deg, #181c28 0%, var(--c-card) 100%);
}
.brand { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
.logo {
  width: 52px; height: 52px; flex: none;
  background: linear-gradient(135deg, #fde293 0%, var(--c-gold-hi) 35%, var(--c-gold) 70%, #b88a06 100%);
  color: #1a1500; font-weight: 700; font-size: 28px;
  border-radius: 14px;
  display: grid; place-items: center;
  font-family: 'Roboto', sans-serif;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.6),
    inset 0 -2px 4px rgba(0,0,0,0.2),
    0 4px 16px rgba(240,185,11,0.45),
    0 0 30px rgba(240,185,11,0.18);
}
.brand h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.01em; color: var(--c-text); }
.brand .sub { font-size: 11.5px; color: var(--c-text-3); margin-top: 4px; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; }
.head-right { display: flex; align-items: center; gap: 10px; flex: none; }

.status-pill {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 6px 12px; border-radius: 4px;
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
}
.status-pill.on  { background: var(--c-bull-soft); color: var(--c-bull); border: 1px solid rgba(14,203,129,0.35); }
.status-pill.off { background: rgba(108,113,128,0.12); color: var(--c-text-3); border: 1px solid var(--c-line); }
.status-pill .dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, currentColor, transparent 80%), currentColor;
  box-shadow: 0 0 8px currentColor;
}
.status-pill .dot.pulse { animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px currentColor, 0 0 12px currentColor; }
  50%      { opacity: .55; box-shadow: 0 0 3px currentColor; }
}

.notice {
  padding: 5px 10px; border-radius: 4px;
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
}
.notice.ok  { background: var(--c-bull-soft); color: var(--c-bull); }
.notice.err { background: var(--c-bear-soft); color: var(--c-bear); }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.tone-good { color: var(--c-bull); }
.tone-bad  { color: var(--c-bear); }

/* ─── 引导卡 ─── */
.onboard {
  display: flex; align-items: center; gap: 18px;
  background:
    linear-gradient(135deg, rgba(240,185,11,0.08), transparent 50%),
    var(--c-card);
  border: 1px solid rgba(240,185,11,0.3);
}
.ob-icon { flex: none; width: 56px; height: 56px; background: rgba(240,185,11,0.12); border-radius: 12px; display: grid; place-items: center; }
.ob-icon .msi { color: var(--c-gold) !important; }
.ob-text { flex: 1; min-width: 0; }
.ob-title { font-size: 15px; font-weight: 600; color: var(--c-text); }
.ob-sub { font-size: 12.5px; color: var(--c-text-3); margin-top: 4px; line-height: 1.55; }

/* ─── 净值卡 ─── */
.equity-card {
  display: flex; align-items: center; gap: 24px;
  background:
    radial-gradient(800px 200px at 100% 0%, rgba(14,203,129,0.05), transparent 70%),
    var(--c-card);
  position: relative;
  overflow: hidden;
}
.equity-card::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: linear-gradient(180deg, var(--c-gold), transparent);
}
.eq-l { flex: 1; min-width: 0; }
.lbl { font-size: 10px; color: var(--c-text-3); text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; }
.big {
  font-size: 42px; font-weight: 600; line-height: 1.05;
  letter-spacing: -0.01em; margin-top: 6px;
  font-variant-numeric: tabular-nums;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  color: var(--c-text);
  text-shadow: 0 0 24px rgba(238,240,245,0.15);
}
.meta-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 12px; font-size: 12px; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; }
.pnl-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 12px; border-radius: 4px;
  font-size: 12.5px; font-weight: 600;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
}
.pnl-pill.pos {
  background: var(--c-bull-soft); color: var(--c-bull);
  border: 1px solid rgba(14,203,129,0.3);
  box-shadow: 0 0 12px rgba(14,203,129,0.18);
}
.pnl-pill.neg {
  background: var(--c-bear-soft); color: var(--c-bear);
  border: 1px solid rgba(246,70,93,0.3);
  box-shadow: 0 0 12px rgba(246,70,93,0.18);
}
.dim { color: var(--c-text-3); }
.today strong { font-weight: 600; }
.spark { width: 260px; height: 72px; flex: none; filter: drop-shadow(0 0 6px rgba(14,203,129,0.25)); }

/* ─── tabs (交易所底栏风,金色下划线) ─── */
.tabs {
  display: flex; gap: 0;
  max-width: 1180px; margin: 0 auto 12px;
  padding: 0 4px;
  background: var(--c-card);
  border: 1px solid var(--c-line);
  border-radius: 8px;
  overflow-x: auto;
}
.tab {
  position: relative;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 11px 18px;
  border: 0; background: transparent;
  color: var(--c-text-3);
  font-size: 12.5px; font-weight: 600;
  letter-spacing: 0.04em; text-transform: uppercase;
  cursor: pointer; white-space: nowrap;
  transition: color .15s;
}
.tab:hover { color: var(--c-text-2); }
.tab.active { color: var(--c-gold); }
.tab.active::after {
  content: ''; position: absolute;
  left: 18px; right: 18px; bottom: -1px;
  height: 2px; background: var(--c-gold);
  box-shadow: 0 0 8px var(--c-gold);
  border-radius: 2px 2px 0 0;
}

/* ─── KPI grid ─── */
.kpi-grid {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 10px; max-width: 1180px; margin: 0 auto 12px;
}
.kpi {
  margin: 0; padding: 14px 16px;
  display: flex; align-items: center; gap: 12px;
  background: var(--c-card);
}
.kic {
  width: 36px; height: 36px;
  background: rgba(240,185,11,0.1); color: var(--c-gold);
  border: 1px solid rgba(240,185,11,0.25);
  border-radius: 8px;
  display: grid; place-items: center;
  flex: none;
}
.kv { min-width: 0; }
.kl { font-size: 10px; color: var(--c-text-3); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; }
.kn { font-size: 18px; font-weight: 600; margin-top: 4px; letter-spacing: 0.01em; font-variant-numeric: tabular-nums; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; color: var(--c-text); }

/* ─── 决策列表(终端日志风) ─── */
.empty-mini { padding: 32px; text-align: center; color: var(--c-text-3); font-size: 13px; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; }
.dec-list { display: flex; flex-direction: column; }
.dec {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 11px 4px;
  border-bottom: 1px solid var(--c-line-soft);
  transition: background .12s;
}
.dec:hover { background: rgba(255,255,255,0.02); }
.dec:last-child { border-bottom: 0; }
.dec.full { padding: 14px 4px; }
.dec-dot {
  width: 8px; height: 8px; margin-top: 8px; border-radius: 50%; flex: none;
  background: var(--c-text-3);
}
.dec-dot.ok  { background: var(--c-bull); box-shadow: 0 0 6px rgba(14,203,129,0.6); }
.dec-dot.bad { background: var(--c-bear); box-shadow: 0 0 6px rgba(246,70,93,0.6); }
.dec-body { flex: 1; min-width: 0; }
.dec-t { font-size: 13px; line-height: 1.55; word-break: break-word; color: var(--c-text); }
.dec-err {
  margin: 6px 0 0;
  padding: 8px 10px;
  background: rgba(246,70,93,0.06); color: var(--c-bear);
  border: 1px solid rgba(246,70,93,0.25);
  border-radius: 4px;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  font-size: 11.5px; line-height: 1.5;
  white-space: pre-wrap;
  max-height: 160px; overflow-y: auto;
}
.dec-m {
  margin-top: 6px; display: flex; align-items: center; gap: 8px;
  font-size: 11px; color: var(--c-text-3);
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
}
.dec-m .time { margin-left: auto; }

/* ─── 表格(持仓 / 订单)交易所 dense 风 ─── */
.t-table {
  display: flex; flex-direction: column;
  font-size: 12px;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
}
.tr {
  display: grid;
  grid-template-columns: 1.6fr 60px 80px 100px 100px 1.6fr 70px;
  gap: 10px; padding: 9px 8px;
  align-items: center;
  border-bottom: 1px solid var(--c-line-soft);
  transition: background .12s;
}
.tr:not(.head):hover { background: rgba(255,255,255,0.025); }
.t-table.orders .tr {
  grid-template-columns: 1.6fr 80px 90px 110px 90px 100px 100px;
}
.tr:last-child { border-bottom: 0; }
.tr.head {
  font-size: 10px; color: var(--c-text-3);
  text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;
  padding: 8px 8px 6px;
  border-bottom: 1px solid var(--c-line);
  background: rgba(255,255,255,0.015);
}
.num { text-align: right; font-variant-numeric: tabular-nums; }
.mono { font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; }
.inst { font-size: 12.5px; color: var(--c-text); font-weight: 500; }
.t-tag {
  display: inline-block; margin-left: 8px;
  padding: 1px 6px;
  background: rgba(255,255,255,0.05); color: var(--c-text-3);
  border: 1px solid var(--c-line);
  border-radius: 3px; font-size: 9.5px;
  letter-spacing: 0.06em;
  font-weight: 600;
}
.dim { color: var(--c-text-3); }
.side {
  display: inline-block; padding: 3px 10px;
  border-radius: 3px;
  font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.side.long  { background: var(--c-bull-soft); color: var(--c-bull); border: 1px solid rgba(14,203,129,0.3); }
.side.short { background: var(--c-bear-soft); color: var(--c-bear); border: 1px solid rgba(246,70,93,0.3); }
.side.net   { background: rgba(255,255,255,0.04); color: var(--c-text-2); border: 1px solid var(--c-line); }
.ratio { font-size: 10.5px; opacity: 0.75; margin-left: 4px; }
.time-cell { font-size: 11px; color: var(--c-text-3); }

.badge {
  display: inline-block; padding: 3px 9px; border-radius: 3px;
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
}
.badge.success { background: var(--c-bull-soft); color: var(--c-bull); border: 1px solid rgba(14,203,129,0.3); }
.badge.pending { background: rgba(240,185,11,0.12); color: var(--c-gold); border: 1px solid rgba(240,185,11,0.3); }
.badge.running { background: rgba(58,140,255,0.12); color: #5e9eff; border: 1px solid rgba(58,140,255,0.3); }
.badge.mute    { background: rgba(255,255,255,0.04); color: var(--c-text-3); border: 1px solid var(--c-line); }

/* ─── 设置表单 ─── */
.form { display: flex; flex-direction: column; gap: 14px; }
.row { display: flex; flex-direction: column; gap: 6px; }
.row label {
  font-size: 10.5px; color: var(--c-text-3);
  letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
}
.text-input {
  width: 100%; padding: 10px 14px;
  border: 1px solid var(--c-line);
  background: rgba(0,0,0,0.25);
  color: var(--c-text);
  border-radius: 6px;
  font-size: 13px; outline: 0;
  transition: border-color .15s, box-shadow .15s, background .15s;
}
.text-input:focus {
  border-color: var(--c-gold);
  background: rgba(0,0,0,0.4);
  box-shadow: 0 0 0 1px var(--c-gold), 0 0 12px rgba(240,185,11,0.15);
}
.text-input.mono { font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; }
.text-input.area { font-family: inherit; font-size: 13.5px; line-height: 1.6; resize: vertical; min-height: 110px; }
.text-input.select { appearance: none; cursor: pointer; padding-right: 36px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a0a4b3' stroke-width='2'><path d='M6 9l6 6 6-6'/></svg>");
  background-repeat: no-repeat; background-position: right 12px center;
}
.text-input.select.small { padding: 6px 28px 6px 12px; font-size: 12px; border-radius: 4px; }

.actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding-top: 4px; }
.inline-msg {
  padding: 4px 10px; border-radius: 4px; font-size: 11px;
  font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
}
.inline-msg.ok  { background: var(--c-bull-soft); color: var(--c-bull); border: 1px solid rgba(14,203,129,0.3); }
.inline-msg.err { background: var(--c-bear-soft); color: var(--c-bear); border: 1px solid rgba(246,70,93,0.3); }

.kvs { display: flex; flex-direction: column; gap: 0; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; }
.kvs .kv { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--c-line-soft); font-size: 12.5px; align-items: center; }
.kvs .kv:last-child { border-bottom: 0; }
.kvs .kv span:first-child { color: var(--c-text-3); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
.kvs .kv code { font-family: inherit; background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 3px; font-size: 11.5px; color: var(--c-text); border: 1px solid var(--c-line); }
.kvs .kv.full { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
.err-mono {
  margin: 0; padding: 10px 12px;
  background: rgba(246,70,93,0.06); color: var(--c-bear);
  border: 1px solid rgba(246,70,93,0.25);
  border-radius: 4px;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  font-size: 11.5px; line-height: 1.55;
  white-space: pre-wrap; word-break: break-word;
  width: 100%;
}

/* ─── 按钮(交易所风) ─── */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--c-line);
  background: rgba(255,255,255,0.04);
  color: var(--c-text-2);
  border-radius: 6px;
  font-size: 12.5px; font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer; white-space: nowrap;
  transition: background .15s, color .15s, border-color .15s, box-shadow .15s, transform .08s;
}
.btn:hover { background: rgba(255,255,255,0.08); color: var(--c-text); border-color: rgba(255,255,255,0.15); }
.btn:active { transform: translateY(1px); }
.btn.small { padding: 5px 11px; font-size: 11.5px; border-radius: 4px; }
.btn.ghost { border-color: transparent; background: transparent; }
.btn.ghost:hover { background: rgba(255,255,255,0.05); color: var(--c-text); }
.btn.solid {
  background: linear-gradient(180deg, var(--c-gold-hi), var(--c-gold));
  color: #1a1500;
  border-color: var(--c-gold);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.5),
    0 1px 4px rgba(240,185,11,0.4),
    0 0 0 1px rgba(240,185,11,0.2);
  text-shadow: 0 1px 0 rgba(255,255,255,0.25);
}
.btn.solid:hover:not(:disabled) {
  background: linear-gradient(180deg, #ffd95c, var(--c-gold-hi));
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.6),
    0 2px 10px rgba(240,185,11,0.55),
    0 0 0 1px rgba(240,185,11,0.3);
}
.btn.solid:disabled { opacity: .35; cursor: default; box-shadow: none; }
.btn.outline.danger {
  color: var(--c-bear);
  border-color: rgba(246,70,93,0.35);
  background: rgba(246,70,93,0.06);
}
.btn.outline.danger:hover {
  background: rgba(246,70,93,0.14);
  border-color: var(--c-bear);
  color: var(--c-bear);
  box-shadow: 0 0 12px rgba(246,70,93,0.25);
}

@media (max-width: 760px) {
  .page { padding: 16px 14px 40px; }
  .head-card { flex-direction: column; align-items: stretch; }
  .head-right { justify-content: flex-end; }
  .equity-card { flex-direction: column; align-items: stretch; }
  .spark { width: 100%; }
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .tr { grid-template-columns: 1.4fr 60px 80px 1.6fr; gap: 8px; font-size: 12px; }
  .tr > :nth-child(4), .tr > :nth-child(5), .tr > :nth-child(7) { display: none; }
  .t-table.orders .tr { grid-template-columns: 1.4fr 70px 80px 100px; }
  .t-table.orders .tr > :nth-child(4), .t-table.orders .tr > :nth-child(6), .t-table.orders .tr > :nth-child(7) { display: none; }
}
</style>
