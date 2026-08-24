<script setup>
// 文明 — 人类世仪表盘
// 8 个区块: 行星 / 自然 / 太空 / 经济 / 加密 / 知识 / 媒体 / 人间(秒级插值)
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { renderMd } from '@/utils/renderMd.js';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';
import Sparkline from './Sparkline.vue';

// ─── 各区块数据 ────────────────────────────────────
const co2     = ref(null);
const quakes  = ref(null);
const space   = ref(null);
const kp      = ref(null);
const markets = ref([]);
const crypto  = ref([]);
const wiki    = ref([]);
const wikiLang = ref('zh');
const news    = ref([]);
const hn      = ref([]);
const arxiv   = ref([]);
const conflict = ref(null);
const econ     = ref(null);
const report = ref('');
const reportId = ref(null);
const reportGeneratedAt = ref('');
const reportLoading = ref(false);
const reportError = ref('');
const reportHistory = ref([]);
const reportHtml = computed(() => renderMd(report.value));

// 轻量请求工具
const get = async (path) => {
  try {
    const r = await fetch(path).then((x) => x.json());
    return r.ok ? r : null;
  } catch { return null; }
};

const post = async (path) => {
  const res = await fetch(path, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false || data.success === false) {
    throw new Error(data.error || data.message || `${res.status} ${res.statusText}`);
  }
  return data;
};

async function loadCO2()     { const r = await get('/apps/civ/co2');     if (r) co2.value = r; }
async function loadQuakes()  { const r = await get('/apps/civ/quakes');  if (r) quakes.value = r; }
async function loadSpace()   { const r = await get('/apps/civ/space');   if (r) space.value = r; }
async function loadKp()      { const r = await get('/apps/civ/kp');      if (r) kp.value = r; }
async function loadMarkets() { const r = await get('/apps/civ/markets'); if (r) markets.value = r.items || []; }
async function loadCrypto()  { const r = await get('/apps/civ/crypto');  if (r) crypto.value = r.items || []; }
async function loadWiki()    { const r = await get(`/apps/civ/wiki?lang=${wikiLang.value}`); if (r) wiki.value = r.items || []; }
async function loadNews()    { const r = await get('/apps/civ/news');    if (r) news.value = r.items || []; }
async function loadHN()      { const r = await get('/apps/civ/hn');      if (r) hn.value = r.items || []; }
async function loadArxiv()   { const r = await get('/apps/civ/arxiv');   if (r) arxiv.value = r.items || []; }
async function loadConflict(){ const r = await get('/apps/civ/conflict');if (r) conflict.value = r; }
async function loadEcon()    { const r = await get('/apps/civ/econ');    if (r) econ.value = r; }

function loadAll() {
  loadCO2(); loadQuakes(); loadSpace(); loadKp();
  loadMarkets(); loadCrypto();
  loadWiki(); loadNews(); loadHN(); loadArxiv();
  loadConflict(); loadEcon();
}

function applyReport(item) {
  if (!item) return;
  report.value = item.report || '';
  reportId.value = item.id || null;
  reportGeneratedAt.value = item.created_at || item.generatedAt || '';
}

async function loadLatestReport() {
  const r = await get('/apps/civ/report/latest');
  if (r?.item) applyReport(r.item);
}

async function loadReportHistory() {
  const r = await get('/apps/civ/report/list');
  if (r?.items) reportHistory.value = r.items;
}

async function switchReport(id) {
  const r = await get(`/apps/civ/report/detail?id=${id}`);
  if (r?.item) applyReport(r.item);
}

async function generateReport() {
  if (reportLoading.value) return;
  reportLoading.value = true;
  reportError.value = '';
  try {
    const data = await post(`/apps/civ/report?lang=${wikiLang.value}`);
    applyReport({ id: data.id, report: data.report, created_at: data.generatedAt });
    await loadReportHistory();
  } catch (e) {
    reportError.value = e.message || '报告生成失败';
  } finally {
    reportLoading.value = false;
  }
}

// 大数字格式化(智能):核弹头 12,331 / 流离失所 1.23 亿 / 军费 2.44 万亿美元
function fmtFact(f) {
  if (f.id === 'milspend') return (f.value / 1000).toFixed(2) + ' 万亿';
  if (f.id === 'displaced') return (f.value / 100000000).toFixed(2) + ' 亿';
  return f.value.toLocaleString('en-US');
}

// ─── 人间区:秒级插值 ───────────────────────────────
const BASE_TS = Date.UTC(2026, 0, 1);
const BASE = { population: 8214000000 };
const RATE = {
  births: 4.4, deaths: 2.0, co2_t: 1167, energy_mwh: 685,
  google: 99000,    // ≈ 8.5B 次/天
  emails: 3473000,  // ≈ 300B 封/天
  cars:   2.5,      // ≈ 78M 辆/年 售出
  iphones: 7.4      // ≈ 2.3 亿台/年
};
const tick = ref(0);
let timer = null;

// 全球 GDP / 秒 — 总量除以一年秒数
const SEC_PER_YEAR = 31557600;
const gdpPerSec = computed(() => (econ.value?.facts?.globalGdpUsd || 110e12) / SEC_PER_YEAR);

const stats = computed(() => {
  const elapsed = (Date.now() - BASE_TS) / 1000;
  return {
    population:  Math.floor(BASE.population + elapsed * (RATE.births - RATE.deaths)),
    births:      Math.floor(elapsed * RATE.births),
    deaths:      Math.floor(elapsed * RATE.deaths),
    co2_t:       Math.floor(elapsed * RATE.co2_t),
    energy_mwh:  Math.floor(elapsed * RATE.energy_mwh),
    google:      Math.floor(elapsed * RATE.google),
    emails:      Math.floor(elapsed * RATE.emails),
    gdp_usd:     Math.floor(elapsed * gdpPerSec.value)
  };
});

// ─── 工具 ──────────────────────────────────────────
const fmtBig = (n) => n.toLocaleString('en-US');
const fmtPrice = (p) => {
  if (p == null) return '-';
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(p < 0.01 ? 6 : 4);
};
const fmtChange = (c) => (c == null ? '-' : (c >= 0 ? '+' : '') + c.toFixed(2) + '%');
const trendColor = (c) => c == null ? '#525968' : c >= 0 ? '#22c55e' : '#f43f5e';
const fmtDateTime = (s) => {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('zh-CN', { hour12: false });
};

function relTime(s) {
  if (!s) return '';
  const d = typeof s === 'number' ? new Date(s) : new Date(s);
  if (isNaN(d.getTime())) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.round(diff / 60) + ' 分钟前';
  if (diff < 86400) return Math.round(diff / 3600) + ' 小时前';
  return Math.round(diff / 86400) + ' 天前';
}
function untilTime(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const diff = (t - Date.now()) / 1000;
  if (diff < 0) return '已发射';
  if (diff < 3600) return Math.round(diff / 60) + ' 分钟后';
  if (diff < 86400) return Math.round(diff / 3600) + ' 小时后';
  return Math.round(diff / 86400) + ' 天后';
}

// 股市分类
const indices    = computed(() => markets.value.filter((m) => ['US','JP','HK','CN','UK','DE'].includes(m.region)));
const commodities= computed(() => markets.value.filter((m) => ['金属','能源','农产'].includes(m.region)));
const forex      = computed(() => markets.value.filter((m) => m.region === '汇率'));

// ─── 生命周期 ─────────────────────────────────────
let dataTimer = null;
onMounted(() => {
  loadAll();
  loadLatestReport();
  loadReportHistory();
  timer = setInterval(() => { tick.value++; }, 200);
  dataTimer = setInterval(loadAll, 60000);
});
onBeforeUnmount(() => { if (timer) clearInterval(timer); if (dataTimer) clearInterval(dataTimer); });
</script>

<template>
  <div class="app-frame bg-[#08080d] text-[#e5e7eb]" style="font-family: -apple-system, 'PingFang SC', sans-serif">

    <!-- topbar -->
    <header class="flex h-16 flex-none items-center px-4 max-md:h-14 max-md:px-2">
      <div class="ml-2 mr-1 flex min-w-0 flex-1 items-center gap-2 text-[18px] font-semibold tracking-wide text-white max-md:text-[15px]">
        <span class="text-base">🌐</span>
        <span class="truncate">文明</span>
        <span class="ml-1 text-[10.5px] font-mono text-[#525968]">CIVILIZATION · LIVE</span>
      </div>
      <button class="icon-btn civ-icon-btn" title="刷新" @click="loadAll">
        <span class="msi sm">refresh</span>
      </button>
      <div class="ml-1 flex items-center gap-1 dark-icons">
        <ChatTrigger />
        <AppsTrigger />
      </div>
    </header>

    <section class="flex-1 min-w-0 min-h-0 overflow-y-auto px-4 pb-12 max-md:px-3">
      <div class="max-w-[1400px] mx-auto grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <section class="report-card lg:col-span-2 xl:col-span-3">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="block-label mb-0">
                <span class="dot bg-cyan-300"></span>
                文明报告
              </div>
              <select
                v-if="reportHistory.length > 0"
                class="report-select"
                :value="reportId"
                @change="switchReport(Number($event.target.value))"
              >
                <option v-for="h in reportHistory" :key="h.id" :value="h.id">{{ fmtDateTime(h.created_at) }}</option>
              </select>
            </div>
            <button v-if="report" class="report-btn text-[12px]" :disabled="reportLoading" @click="generateReport">
              <span v-if="reportLoading">生成中…</span>
              <span v-else>生成新报告</span>
            </button>
          </div>

          <div v-if="reportError" class="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-200">
            {{ reportError }}
          </div>
          <div v-else-if="report" class="report-body mt-4 text-[14px] leading-7 text-[#d9e2ef]" v-html="reportHtml"></div>
          <div v-else class="flex flex-col items-center gap-4 py-10">
            <div class="text-[13px] text-[#525968]">基于下方所有数据看板，AI 生成综合分析报告</div>
            <button class="report-btn" :disabled="reportLoading" @click="generateReport">
              <span v-if="reportLoading">生成中…</span>
              <span v-else>生成报告</span>
            </button>
          </div>
        </section>

        <!-- ── 行星 (人口 + CO₂ + 大气) ── -->
        <section class="block-card">
          <div class="block-label">
            <span class="dot bg-emerald-500"></span>
            行星
          </div>
          <div class="px-1">
            <div class="text-[11px] text-[#525968] mb-1">总人口</div>
            <div class="font-mono text-[34px] font-bold leading-none tracking-tight text-white tabular-nums">
              {{ fmtBig(stats.population) }}
            </div>
            <div class="mt-1 text-[10.5px] text-[#525968]">基于 UN WPP · 每秒 +{{ (4.4 - 2.0).toFixed(1) }}</div>

            <div class="mt-5 grid grid-cols-2 gap-4">
              <div>
                <div class="text-[#525968] text-[11px] mb-0.5">大气 CO₂</div>
                <div class="font-mono text-[20px] font-semibold tabular-nums text-amber-400">
                  {{ co2?.current?.toFixed(2) ?? '...' }} <span class="text-[12px] text-[#525968]">ppm</span>
                </div>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <Sparkline :data="co2?.series || []" :width="60" :height="18" color="#fbbf24" :fill="true" />
                  <span class="font-mono text-[10px] text-[#525968]" v-if="co2?.yearChange != null">
                    +{{ co2.yearChange }} / 年
                  </span>
                </div>
                <div class="mt-1 text-[10px] text-[#3d4452]">工业化前 280 ppm</div>
              </div>
              <div>
                <div class="text-[#525968] text-[11px] mb-0.5">极光指数 Kp</div>
                <div class="font-mono text-[20px] font-semibold tabular-nums"
                  :style="{ color: kp?.current >= 5 ? '#22c55e' : '#7a8298' }">
                  {{ kp?.current?.toFixed(0) ?? '...' }} <span class="text-[12px] text-[#525968]">/ 9</span>
                </div>
                <Sparkline :data="kp?.series || []" :width="60" :height="18" color="#22c55e" />
                <div class="mt-1 text-[10px] text-[#3d4452]">≥5 可见极光</div>
              </div>
            </div>
          </div>
        </section>

        <!-- ── 自然 (地震) ── -->
        <section class="block-card">
          <div class="block-label">
            <span class="dot bg-rose-500"></span>
            自然 · 24h
          </div>
          <div class="px-1">
            <div class="text-[11px] text-[#525968] mb-1">地震总数</div>
            <div class="flex items-baseline gap-3">
              <div class="font-mono text-[34px] font-bold leading-none tracking-tight text-white tabular-nums">
                {{ quakes?.total ?? '...' }}
              </div>
              <Sparkline :data="quakes?.series || []" :width="100" :height="26" color="#f43f5e" :fill="true" />
            </div>
            <div class="mt-3 grid grid-cols-2 gap-4">
              <div>
                <div class="text-[#525968] text-[11px] mb-0.5">≥ M5 强震</div>
                <div class="font-mono text-[20px] font-semibold text-rose-400 tabular-nums">{{ quakes?.m5plus ?? 0 }}</div>
              </div>
              <div v-if="quakes?.largest">
                <div class="text-[#525968] text-[11px] mb-0.5">最大震级</div>
                <div class="font-mono text-[20px] font-semibold text-rose-400 tabular-nums">M {{ quakes.largest.mag.toFixed(1) }}</div>
                <div class="text-[10px] text-[#525968] mt-0.5 truncate" :title="quakes.largest.place">
                  {{ quakes.largest.place }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ── 太空 (ISS + 在轨 + 发射) ── -->
        <section class="block-card">
          <div class="block-label">
            <span class="dot bg-sky-400"></span>
            太空
          </div>
          <div class="px-1">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-[#525968] text-[11px] mb-0.5">在轨人数</div>
                <div class="font-mono text-[34px] font-bold tabular-nums text-white">{{ space?.crew?.total ?? '...' }}</div>
              </div>
              <div v-if="space?.iss">
                <div class="text-[#525968] text-[11px] mb-0.5">ISS 现在</div>
                <div class="font-mono text-[14px] tabular-nums text-sky-400">
                  {{ space.iss.lat.toFixed(1) }}°, {{ space.iss.lng.toFixed(1) }}°
                </div>
                <div class="font-mono text-[11px] text-[#525968] mt-0.5">
                  {{ space.iss.altKm }} km · {{ space.iss.speedKmh.toLocaleString() }} km/h
                </div>
              </div>
            </div>
            <div v-if="space?.launches?.length" class="mt-4 border-t border-white/[0.04] pt-3 space-y-2">
              <div class="text-[10px] uppercase tracking-wider text-[#525968]">即将发射</div>
              <div v-for="l in space.launches.slice(0, 3)" :key="l.id" class="flex items-baseline justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="text-[12.5px] text-[#e5e7eb] truncate">{{ l.name }}</div>
                  <div class="text-[10px] text-[#525968] truncate">{{ l.location }}</div>
                </div>
                <div class="font-mono text-[11px] text-sky-400 shrink-0">{{ untilTime(l.net) }}</div>
              </div>
            </div>
          </div>
        </section>

        <!-- ── 财富 / 经济总量 ── -->
        <section class="block-card">
          <div class="block-label">
            <span class="dot bg-yellow-500"></span>
            财富
          </div>
          <div v-if="!econ" class="px-1 text-[12px] text-[#525968]">加载中…</div>
          <template v-else>
            <div class="px-1">
              <div class="text-[11px] text-[#525968] mb-1">今年累计全球 GDP</div>
              <div class="font-mono text-[26px] font-bold leading-none tracking-tight text-amber-300 tabular-nums">
                ${{ fmtBig(stats.gdp_usd) }}
              </div>
              <div class="mt-1 text-[10.5px] text-[#525968]">
                全球 ${{ (econ.facts.globalGdpUsd / 1e12).toFixed(1) }} 万亿/年 · 增长 {{ econ.facts.globalGrowth }}% · 人均 ${{ econ.facts.perCapitaUsd.toLocaleString() }}
              </div>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 px-1">
              <div>
                <div class="text-[#525968] text-[11px] mb-0.5">极端贫困人口</div>
                <div class="font-mono text-[16px] font-semibold tabular-nums text-rose-300">{{ (econ.facts.extremePoverty / 1e6).toFixed(0) }}M</div>
                <div class="text-[10px] text-[#3d4452] mt-0.5">每日 &lt; $2.15</div>
              </div>
              <div>
                <div class="text-[#525968] text-[11px] mb-0.5">最富 1% 财富占比</div>
                <div class="font-mono text-[16px] font-semibold tabular-nums text-amber-300">{{ econ.facts.top1WealthPct }}%</div>
                <div class="text-[10px] text-[#3d4452] mt-0.5">UBS Global Wealth</div>
              </div>
              <div>
                <div class="text-[#525968] text-[11px] mb-0.5">全球总债务</div>
                <div class="font-mono text-[16px] font-semibold tabular-nums text-rose-300">${{ (econ.facts.globalDebt / 1e12).toFixed(0) }}T</div>
                <div class="text-[10px] text-[#3d4452] mt-0.5">≈ 全球 GDP × {{ (econ.facts.globalDebt / econ.facts.globalGdpUsd).toFixed(1) }}</div>
              </div>
              <div>
                <div class="text-[#525968] text-[11px] mb-0.5">每秒 GDP</div>
                <div class="font-mono text-[16px] font-semibold tabular-nums text-amber-300">${{ Math.round(gdpPerSec).toLocaleString() }}</div>
                <div class="text-[10px] text-[#3d4452] mt-0.5">全球 / 秒</div>
              </div>
            </div>
            <div class="mt-4 border-t border-white/[0.04] pt-3">
              <div class="text-[10px] uppercase tracking-wider text-[#525968] mb-2">前 10 经济体</div>
              <div class="space-y-1.5">
                <div v-for="(c, i) in econ.topEconomies" :key="c.name" class="flex items-center gap-3 text-[12.5px]">
                  <span class="font-mono text-[10.5px] text-[#525968] w-5 shrink-0 tabular-nums">{{ i + 1 }}</span>
                  <span class="text-base">{{ c.region }}</span>
                  <span class="flex-1 text-[#e5e7eb] truncate">{{ c.name }}</span>
                  <span class="font-mono tabular-nums text-amber-300">${{ c.gdp.toFixed(2) }}T</span>
                </div>
              </div>
            </div>
          </template>
        </section>

        <!-- ── 军备 / 风险 ── -->
        <section class="block-card">
          <div class="block-label">
            <span class="dot bg-red-500"></span>
            军备 · 风险
          </div>
          <div v-if="!conflict" class="px-1 text-[12px] text-[#525968]">加载中…</div>
          <div v-else class="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
            <div v-for="f in conflict.facts" :key="f.id">
              <div class="text-[#525968] text-[11px] mb-0.5 flex items-baseline gap-1.5">
                <span>{{ f.label }}</span>
                <span class="text-[10px] text-[#3d4452] truncate">{{ f.note }}</span>
              </div>
              <div class="font-mono text-[18px] font-semibold tabular-nums text-rose-300">
                {{ fmtFact(f) }}<span class="ml-1 text-[11px] text-[#525968] font-normal">{{ f.unit === '亿美元' ? '美元' : f.unit }}</span>
              </div>
              <div class="text-[10px] text-[#3d4452] mt-0.5 truncate">{{ f.source }}</div>
            </div>
          </div>
        </section>

        <!-- ── 经济 · 股指 ── -->
        <section class="block-card">
          <div class="block-label">
            <span class="dot bg-yellow-400"></span>
            经济 · 股指
          </div>
          <div v-if="!indices.length" class="px-1 text-[12px] text-[#525968]">加载中…</div>
          <div v-else class="divide-y divide-white/[0.04]">
            <div v-for="m in indices" :key="m.symbol"
              class="flex items-center gap-3 py-1.5 px-1">
              <div class="text-[12.5px] text-white w-[78px] truncate">{{ m.label }}</div>
              <Sparkline :data="m.series || []" :width="50" :height="14" :color="m.change >= 0 ? '#22c55e' : '#f43f5e'" />
              <div class="flex-1 text-right font-mono text-[13px] text-white tabular-nums">{{ fmtPrice(m.price) }}</div>
              <div class="font-mono text-[11px] tabular-nums w-[52px] text-right" :style="{ color: trendColor(m.change) }">
                {{ fmtChange(m.change) }}
              </div>
            </div>
          </div>
        </section>

        <!-- ── 经济 · 大宗 + 汇率 ── -->
        <section class="block-card">
          <div class="block-label">
            <span class="dot bg-amber-400"></span>
            大宗 · 汇率
          </div>
          <div v-if="!commodities.length" class="px-1 text-[12px] text-[#525968]">加载中…</div>
          <div v-else>
            <div class="divide-y divide-white/[0.04]">
              <div v-for="m in commodities" :key="m.symbol" class="flex items-center gap-3 py-1.5 px-1">
                <div class="text-[12.5px] text-white w-[78px] truncate">{{ m.label }}</div>
                <Sparkline :data="m.series || []" :width="50" :height="14" :color="m.change >= 0 ? '#22c55e' : '#f43f5e'" />
                <div class="flex-1 text-right font-mono text-[13px] text-white tabular-nums">{{ fmtPrice(m.price) }}</div>
                <div class="font-mono text-[11px] tabular-nums w-[52px] text-right" :style="{ color: trendColor(m.change) }">
                  {{ fmtChange(m.change) }}
                </div>
              </div>
            </div>
            <div v-if="forex.length" class="mt-2 border-t border-white/[0.04] pt-2">
              <div v-for="m in forex" :key="m.symbol" class="flex items-center gap-3 py-1.5 px-1">
                <div class="text-[12.5px] text-white w-[78px] truncate">{{ m.label }}</div>
                <div class="flex-1 text-right font-mono text-[13px] text-white tabular-nums">{{ fmtPrice(m.price) }}</div>
                <div class="font-mono text-[11px] tabular-nums w-[52px] text-right" :style="{ color: trendColor(m.change) }">
                  {{ fmtChange(m.change) }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ── 加密市场 ── -->
        <section class="block-card">
          <div class="block-label">
            <span class="dot bg-orange-400"></span>
            加密
          </div>
          <div v-if="!crypto.length" class="px-1 text-[12px] text-[#525968]">加载中…</div>
          <div v-else class="divide-y divide-white/[0.04]">
            <div v-for="c in crypto.slice(0, 8)" :key="c.id" class="flex items-center gap-3 py-1.5 px-1">
              <img :src="c.image" class="h-5 w-5 shrink-0 rounded-full" loading="lazy" />
              <div class="text-[12.5px] text-white w-[68px] truncate">{{ c.symbol }}</div>
              <Sparkline :data="c.spark || []" :width="50" :height="14" :color="c.change24h >= 0 ? '#22c55e' : '#f43f5e'" />
              <div class="flex-1 text-right font-mono text-[13px] text-white tabular-nums">${{ fmtPrice(c.price) }}</div>
              <div class="font-mono text-[11px] tabular-nums w-[52px] text-right" :style="{ color: trendColor(c.change24h) }">
                {{ fmtChange(c.change24h) }}
              </div>
            </div>
          </div>
        </section>

        <!-- ── 知识 · 维基百科最热 ── -->
        <section class="block-card">
          <div class="block-label">
            <span class="dot bg-violet-400"></span>
            人类此刻好奇什么
            <span class="ml-auto flex items-center gap-1 text-[10px] font-normal normal-case tracking-normal">
              <button class="px-2 py-0.5 rounded transition-colors"
                :class="wikiLang === 'zh' ? 'bg-white/10 text-white' : 'text-[#525968] hover:text-[#e5e7eb]'"
                @click="wikiLang = 'zh'; loadWiki()">中</button>
              <button class="px-2 py-0.5 rounded transition-colors"
                :class="wikiLang === 'en' ? 'bg-white/10 text-white' : 'text-[#525968] hover:text-[#e5e7eb]'"
                @click="wikiLang = 'en'; loadWiki()">EN</button>
              <button class="px-2 py-0.5 rounded transition-colors"
                :class="wikiLang === 'ja' ? 'bg-white/10 text-white' : 'text-[#525968] hover:text-[#e5e7eb]'"
                @click="wikiLang = 'ja'; loadWiki()">JA</button>
            </span>
          </div>
          <div v-if="!wiki.length" class="px-1 text-[12px] text-[#525968]">加载中…</div>
          <ol v-else class="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13px]">
            <li v-for="(w, i) in wiki.slice(0, 12)" :key="w.title" class="flex items-baseline gap-2">
              <span class="font-mono text-[10.5px] text-[#525968] w-5 shrink-0 tabular-nums">{{ i + 1 }}</span>
              <a :href="w.url" target="_blank"
                class="flex-1 min-w-0 truncate text-[#e5e7eb] hover:text-sky-400 transition-colors">{{ w.title }}</a>
              <span class="font-mono text-[10.5px] text-[#3d4452] tabular-nums">{{ (w.views / 1000).toFixed(0) }}k</span>
            </li>
          </ol>
        </section>

        <!-- ── 极客圈 (HN + arXiv) ── -->
        <section class="block-card">
          <div class="block-label">
            <span class="dot bg-orange-500"></span>
            极客 · HN
          </div>
          <div v-if="!hn.length" class="px-1 text-[12px] text-[#525968]">加载中…</div>
          <ul v-else class="space-y-2 text-[13px]">
            <li v-for="(it, i) in hn.slice(0, 6)" :key="it.id" class="flex items-baseline gap-2">
              <span class="font-mono text-[10.5px] text-[#525968] w-5 shrink-0 tabular-nums">{{ i + 1 }}</span>
              <div class="flex-1 min-w-0">
                <a :href="it.url" target="_blank"
                  class="block text-[#e5e7eb] hover:text-orange-400 transition-colors line-clamp-2 leading-snug">{{ it.title }}</a>
                <div class="mt-0.5 text-[10px] font-mono text-[#3d4452]">{{ it.score }} ↑ · {{ it.comments }} 💬 · {{ relTime(it.time) }}</div>
              </div>
            </li>
          </ul>
          <div v-if="arxiv.length" class="mt-3 border-t border-white/[0.04] pt-3 space-y-1.5">
            <div class="text-[10px] uppercase tracking-wider text-[#525968]">arXiv 新论文</div>
            <a v-for="(p, i) in arxiv.slice(0, 4)" :key="i" :href="p.link" target="_blank"
              class="block truncate text-[12px] text-[#a8b3c5] hover:text-violet-400 transition-colors">
              <span class="font-mono text-[10px] text-[#525968] mr-1.5">{{ p.cat }}</span>{{ p.title }}
            </a>
          </div>
        </section>

        <!-- ── 头条 ── -->
        <section class="block-card lg:col-span-2 xl:col-span-2">
          <div class="block-label">
            <span class="dot bg-red-400"></span>
            全球头条
          </div>
          <div v-if="!news.length" class="px-1 text-[12px] text-[#525968]">加载中…</div>
          <div v-else class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
            <div v-for="src in news" :key="src.id">
              <div class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7a8298] mb-2">{{ src.name }}</div>
              <ul class="space-y-2 text-[12.5px]">
                <li v-for="(item, i) in src.items.slice(0, 4)" :key="i" class="leading-snug">
                  <a :href="item.link" target="_blank"
                    class="text-[#e5e7eb] hover:text-sky-400 transition-colors line-clamp-2">{{ item.title }}</a>
                  <div v-if="item.time" class="mt-0.5 text-[10px] text-[#3d4452]">{{ relTime(item.time) }}</div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- ── 人间(秒级插值)── -->
        <section class="block-card">
          <div class="block-label">
            <span class="dot bg-pink-400"></span>
            人间 · 此刻起
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
            <div>
              <div class="text-[#525968] text-[11px] mb-0.5">+ 新生</div>
              <div class="font-mono text-[18px] font-semibold tabular-nums text-emerald-400">+{{ fmtBig(stats.births) }}</div>
            </div>
            <div>
              <div class="text-[#525968] text-[11px] mb-0.5">− 逝去</div>
              <div class="font-mono text-[18px] font-semibold tabular-nums text-rose-400">−{{ fmtBig(stats.deaths) }}</div>
            </div>
            <div>
              <div class="text-[#525968] text-[11px] mb-0.5">CO₂ 排放 / 吨</div>
              <div class="font-mono text-[18px] font-semibold tabular-nums text-amber-400">{{ fmtBig(stats.co2_t) }}</div>
            </div>
            <div>
              <div class="text-[#525968] text-[11px] mb-0.5">能源 / MWh</div>
              <div class="font-mono text-[18px] font-semibold tabular-nums text-sky-400">{{ fmtBig(stats.energy_mwh) }}</div>
            </div>
            <div>
              <div class="text-[#525968] text-[11px] mb-0.5">Google 搜索</div>
              <div class="font-mono text-[18px] font-semibold tabular-nums text-violet-400">{{ fmtBig(stats.google) }}</div>
            </div>
            <div>
              <div class="text-[#525968] text-[11px] mb-0.5">收发邮件</div>
              <div class="font-mono text-[18px] font-semibold tabular-nums text-cyan-400">{{ fmtBig(stats.emails) }}</div>
            </div>
          </div>
          <div class="mt-3 text-[10px] text-[#3d4452] px-1">2026-01-01 UTC 起累积 · 速率为 UN/IEA 年度均值</div>
        </section>

      </div>
    </section>
  </div>
</template>

<style scoped>
.civ-icon-btn { color: #c8d6e5; }
.civ-icon-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
.dark-icons :deep(.icon-btn) { color: #c8d6e5; }
.dark-icons :deep(.icon-btn:hover) { background: rgba(255,255,255,0.08); color: #fff; }
.dark-icons :deep(.icon-btn.active) { background: rgba(125,211,252,0.18); color: #7dd3fc; }

.block-card {
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.06);
  background: #0e0f17;
  padding: 18px 16px 16px;
}
.report-card {
  border-radius: 18px;
  border: 1px solid rgba(125,211,252,0.14);
  background:
    radial-gradient(circle at top left, rgba(56,189,248,0.12), transparent 38%),
    linear-gradient(180deg, rgba(17,24,39,0.94), rgba(9,12,20,0.96));
  padding: 20px 18px;
  box-shadow: 0 24px 70px rgba(0,0,0,0.28);
}
.report-btn {
  border-radius: 999px;
  border: 1px solid rgba(125,211,252,0.25);
  background: rgba(125,211,252,0.16);
  color: #dff6ff;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 650;
  transition: background 0.16s ease, border-color 0.16s ease, opacity 0.16s ease;
}
.report-btn:hover:not(:disabled) {
  background: rgba(125,211,252,0.24);
  border-color: rgba(125,211,252,0.42);
}
.report-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.report-btn.secondary {
  border-color: rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.05);
  color: #aab7ca;
}
.report-btn.secondary:hover:not(:disabled) {
  background: rgba(255,255,255,0.09);
  border-color: rgba(255,255,255,0.16);
}
.report-select {
  appearance: none;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  padding: 3px 24px 3px 8px;
  font-size: 11px;
  font-family: ui-monospace, monospace;
  color: #8b95a8;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b7280'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
}
.report-select:hover { border-color: rgba(255,255,255,0.2); }
.report-select option { background: #1a1a2e; color: #d0d8e8; }
.report-body {
  border-top: 1px solid rgba(255,255,255,0.06);
  padding-top: 16px;
}
.report-body :deep(h1) { font-size: 20px; font-weight: 700; margin: 24px 0 8px; color: #e8edf5; }
.report-body :deep(h2) { font-size: 17px; font-weight: 700; margin: 20px 0 6px; color: #d0d8e8; }
.report-body :deep(h3) { font-size: 15px; font-weight: 600; margin: 16px 0 4px; color: #b8c4d8; }
.report-body :deep(p) { margin: 6px 0; }
.report-body :deep(ul), .report-body :deep(ol) { padding-left: 20px; margin: 6px 0; }
.report-body :deep(li) { margin: 3px 0; }
.report-body :deep(strong) { color: #e8edf5; font-weight: 600; }
.report-body :deep(hr) { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 16px 0; }
.report-body :deep(blockquote) { border-left: 3px solid rgba(100,160,255,0.3); padding-left: 12px; color: #8b95a8; margin: 8px 0; }
.report-body :deep(code) { background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 4px; font-size: 13px; }
.report-body :deep(table) { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 13px; }
.report-body :deep(th), .report-body :deep(td) { border: 1px solid rgba(255,255,255,0.08); padding: 6px 10px; text-align: left; }
.report-body :deep(th) { background: rgba(255,255,255,0.04); color: #b8c4d8; font-weight: 600; }
.block-label {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 14px;
  font-size: 10.5px; font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #525968;
}
.block-label .dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex: none;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
