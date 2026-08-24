<template>
  <div class="app-frame font-['PingFang_SC','Microsoft_YaHei',sans-serif]">
    <!-- 书脊顶栏: 红色皮革 + 烫金标题 -->
    <header class="topbar passbook-spine">
      <span class="left-spacer"></span>
      <div class="brand"><span class="name">记账本</span></div>
      <div class="right">
        <ChatTrigger />
        <AppsTrigger />
      </div>
    </header>
    <!-- 书脊与内页之间的金属订线 -->
    <div class="passbook-binding"></div>

    <!-- 内页 -->
    <div class="passbook-pages relative flex flex-1 min-h-0 flex-col">
      <!-- 顶部装订折痕(原来在左边的 spine-crease 改到顶部) -->
      <div class="spine-crease pointer-events-none absolute inset-x-0 top-0 z-10 h-10"></div>

      <FinanceHeader
        :display-month="displayMonth"
        :is-current-month="isCurrentMonth"
        :total-income="totalIncome"
        :total-expense="totalExpense"
        :ending-balance="endingBalance"
        :fmt-amt="fmtAmt"
        @prev-month="prevMonth"
        @next-month="nextMonth"
      />

      <FinanceLedgerTable
        :rows="rows"
        :editing="editing"
        :form="form"
        :today-str="todayStr"
        :saving="saving"
        :fmt-date="fmtDate"
        :fmt-amt="fmtAmt"
        :start-edit="startEdit"
        :save-edit="saveEdit"
        :cancel-edit="cancelEdit"
        :remove="remove"
        :save="save"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useI18n } from '../_shared/i18n.js';
import { chatPanel } from '../_shared/chatPanel.js';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';
import FinanceHeader from './FinanceHeader.vue';
import FinanceLedgerTable from './FinanceLedgerTable.vue';

const { locale, t } = useI18n();
const API_BASE = '/apps/finance';

const now = new Date();
const month = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
const items = ref([]);
const totalIncome = ref(0);
const totalExpense = ref(0);
const saving = ref(false);

const form = reactive({
  newDate: '',
  newNote: '',
  newWithdraw: '',
  newDeposit: ''
});

const editing = reactive({
  active: false,
  id: null,
  field: '',
  value: '',
  original: ''
});

const displayMonth = computed(() => month.value.replace('-', ' / '));
const isCurrentMonth = computed(() => {
  const d = new Date();
  return month.value === `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
});
const todayStr = computed(() => {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
});
const rows = computed(() => items.value);
const endingBalance = computed(() => totalIncome.value - totalExpense.value);

const fmtAmt = (n) => {
  const v = Number(n) || 0;
  return v.toLocaleString(locale.value === 'en' ? 'en-US' : 'zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fetchData = async () => {
  try {
    const res = await fetch(`${API_BASE}/list?month=${month.value}`);
    const data = await res.json();
    items.value = data.items || [];
    totalIncome.value = Number(data.totalIncome || 0);
    totalExpense.value = Number(data.totalExpense || 0);
  } catch (e) {
    console.error(e);
  }
};

const prevMonth = () => {
  const [y, m] = month.value.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  month.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  fetchData();
};

const nextMonth = () => {
  if (isCurrentMonth.value) return;
  const [y, m] = month.value.split('-').map(Number);
  const d = new Date(y, m, 1);
  month.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  fetchData();
};

const save = async () => {
  const withdraw = parseFloat(form.newWithdraw) || 0;
  const deposit = parseFloat(form.newDeposit) || 0;
  if (!withdraw && !deposit) return;
  if (saving.value) return;

  saving.value = true;
  try {
    const type = deposit > 0 ? 'income' : 'expense';
    const amount = deposit > 0 ? deposit : withdraw;
    const note = form.newNote.trim();
    const dateInput = form.newDate.trim() || todayStr.value;
    const dayPart = dateInput.includes('-') ? dateInput.split('-').pop() : dateInput;
    const fullDate = `${month.value}-${dayPart.padStart(2, '0')}T12:00:00`;

    await fetch(`${API_BASE}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, amount, note, date: fullDate })
    });

    form.newDate = '';
    form.newNote = '';
    form.newWithdraw = '';
    form.newDeposit = '';
    await fetchData();
  } catch (e) {
    console.error(e);
  } finally {
    saving.value = false;
  }
};

const startEdit = (row, field) => {
  let value;
  if (field === 'date') value = fmtDate(row.date);
  else if (field === 'amount') value = String(row.amount);
  else value = row.note || '';

  editing.active = true;
  editing.id = row.id;
  editing.field = field;
  editing.value = value;
  editing.original = value;
};

const cancelEdit = () => {
  editing.active = false;
  editing.id = null;
  editing.field = '';
  editing.value = '';
  editing.original = '';
};

const saveEdit = async () => {
  if (!editing.active) return;
  if (editing.value === editing.original) {
    cancelEdit();
    return;
  }

  const body = { id: editing.id };
  if (editing.field === 'date') {
    const dayPart = editing.value.includes('-') ? editing.value.split('-').pop() : editing.value;
    body.date = `${month.value}-${dayPart.padStart(2, '0')}T12:00:00`;
  } else if (editing.field === 'amount') {
    const amt = parseFloat(editing.value);
    if (!amt || amt <= 0) {
      cancelEdit();
      return;
    }
    body.amount = amt;
  } else {
    body.note = editing.value;
  }

  cancelEdit();
  try {
    await fetch(`${API_BASE}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    await fetchData();
  } catch (e) {
    console.error(e);
  }
};

const remove = async (id) => {
  try {
    await fetch(`${API_BASE}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    await fetchData();
  } catch (e) {
    console.error(e);
  }
};

onMounted(() => {
  fetchData();
  chatPanel.setContext({ scene: 'finance', label: t('app_sidebar_finance') });
  chatPanel.setQuickMessages([t('finance_chat_quick_1'), t('finance_chat_quick_2'), t('finance_chat_quick_3')]);
});
onUnmounted(() => { chatPanel.clearContext(); chatPanel.setQuickMessages([]); });
</script>

<style scoped>
.app-frame { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; background: #1a1a1a; }

/* ── 书脊顶栏: 红色皮革 + 烫金书名 ── */
.app-frame > .topbar.passbook-spine {
  flex: none;
  height: 64px;
  display: flex;
  align-items: center;
  padding: 8px 16px;
  position: relative;
  z-index: 5;
  background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #0d0d0d 100%);
  background-image:
    linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 22%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.5) 100%),
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.18'/%3E%3C/svg%3E"),
    linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #0d0d0d 100%);
  background-blend-mode: normal, multiply, normal;
  box-shadow:
    inset 0 1px 0 rgba(255,220,170,0.4),
    inset 0 -1px 0 rgba(0,0,0,0.55),
    0 6px 14px -4px rgba(0,0,0,0.55);
}
/* 书脊上下两条烫金细装饰线 */
.app-frame > .topbar.passbook-spine::before,
.app-frame > .topbar.passbook-spine::after {
  content: "";
  position: absolute;
  left: 14px;
  right: 14px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212,175,55,0.55) 15%, rgba(212,175,55,0.85) 50%, rgba(212,175,55,0.55) 85%, transparent);
  pointer-events: none;
}
.app-frame > .topbar.passbook-spine::before { top: 7px; }
.app-frame > .topbar.passbook-spine::after  { bottom: 7px; }

.app-frame > .topbar .left-spacer { width: 8px; }
.app-frame > .topbar .brand { flex: 1; min-width: 0; margin: 0 4px 0 12px; }
.app-frame > .topbar .brand .name {
  font-size: 21px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #f7d77a;                 /* 烫金 */
  text-shadow:
    0 1px 0 rgba(120, 60, 0, 0.85),
    0 0 6px rgba(247, 215, 122, 0.35),
    0 -1px 0 rgba(0,0,0,0.4);
}
.app-frame > .topbar .right { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.app-frame > .topbar :deep(.icon-btn),
.app-frame > .topbar :deep(button) { color: #f7d77a; }
.app-frame > .topbar :deep(.icon-btn:hover),
.app-frame > .topbar :deep(button:hover) { background: rgba(247, 215, 122, 0.15); }

@media (max-width: 720px) {
  .app-frame > .topbar { padding: 8px; height: 56px; }
  .app-frame > .topbar .brand .name { font-size: 17px; letter-spacing: 0.14em; }
}

/* 书脊与内页之间的金属订线 */
.passbook-binding {
  flex: none;
  height: 8px;
  background:
    linear-gradient(180deg, #1a1a1a 0%, #333 30%, #555 50%, #333 70%, #1a1a1a 100%);
  box-shadow:
    inset 0 1px 1px rgba(0,0,0,0.7),
    0 1px 2px rgba(0,0,0,0.45);
  position: relative;
}
.passbook-binding::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(90deg, transparent 0 9px, rgba(255,255,255,0.08) 9px 11px);
}

/* ── 内页: 米色账本纸 ── */
.passbook-pages {
  background-color: #f0f4f8;
  background-image:
    repeating-linear-gradient(45deg, rgba(82,113,255,0.03) 0, rgba(82,113,255,0.03) 1px, transparent 1px, transparent 12px),
    repeating-linear-gradient(-45deg, rgba(82,113,255,0.03) 0, rgba(82,113,255,0.03) 1px, transparent 1px, transparent 12px);
  box-shadow: inset 0 18px 30px -10px rgba(0,0,0,0.25);   /* 阴影从顶部投下来 */
}

/* 顶部装订折痕(原来左侧的 spine-crease 转 90°) */
.spine-crease {
  background: linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.12) 45%, transparent 100%);
}

.dot-matrix {
  font-family: 'Courier New', Courier, monospace;
  color: #0b1c67;
  text-shadow: 0 0 1px rgba(11,28,103,0.4);
  letter-spacing: 0.5px;
}
</style>
