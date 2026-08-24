<template>
  <div class="app-frame">
    <header class="topbar">
      <span class="left-spacer"></span>
      <div class="brand"><span class="name">记事本</span></div>
      <div class="right">
        <ChatTrigger />
        <AppsTrigger />
      </div>
    </header>
    <main class="notebook-main">
      <NotebookListView
        :view="view"
        :notes="notes"
        :page="page"
        :total-pages="totalPages"
        :loading="loading"
        :card-style="cardStyle"
        :format-time="formatTime"
        :rotations="ROTATIONS"
        :pin-colors="PIN_COLORS"
        @open-editor="openEditor"
        @delete-note="deleteNote"
        @prev-page="goPrevPage"
        @next-page="goNextPage"
      />
      <NotebookEditorView
        :view="view"
        v-model:editorDraft="editorDraft"
        :editing-note-id="editingNoteId"
        :editor-style="editorStyle"
        :saving="saving"
        :ai-drawer-open="aiDrawerOpen"
        :ai-loading="aiLoading"
        :ai-result="aiResult"
        :show-delete-confirm="showDeleteConfirm"
        :current-date="currentDate"
        :card-style="cardStyle"
        @back="backToList"
        @optimize="startOptimize"
        @request-delete="showDeleteConfirm = true"
        @cancel-delete="showDeleteConfirm = false"
        @confirm-delete="confirmDelete"
        @save="saveEditor"
        @apply-ai="applyAI"
        @close-ai="closeAI"
      />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from '../_shared/i18n.js';
import { chatPanel } from '../_shared/chatPanel.js';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';
import NotebookEditorView from './NotebookEditorView.vue';
import NotebookListView from './NotebookListView.vue';

const { locale, t } = useI18n();
const API_BASE = '/apps/notebook';
const PAGE_SIZE = 12;

const view = ref('list');
const notes = ref([]);
const loading = ref(false);
const error = ref('');
const page = ref(1);
const total = ref(0);
const totalPages = ref(1);

const editorDraft = ref('');
const editingNoteId = ref(null);
const editorStyle = ref(0);
const saving = ref(false);
const aiDrawerOpen = ref(false);
const aiLoading = ref(false);
const aiResult = ref('');
const showDeleteConfirm = ref(false);

// 8种卡片样式：Tailwind类 + 需要原生CSS的用class名
// 8种卡片：每种都有独特纹理（CSS class），不再有纯色
const CARD_STYLES = [
  { cardCls: 'card-yellow-lined min-h-[200px] w-[220px] pt-[30px] px-[15px] pb-[15px]', textCls: 'text-[#1c3d5a]', padCls: 'pad-yellow-lined', inkCls: 'text-[#1c3d5a]' },
  { cardCls: 'card-pink-grid min-h-[200px] w-[200px] pt-[25px] px-[15px] pb-[15px]', textCls: 'text-[#a00]', padCls: 'pad-pink-grid', inkCls: 'text-[#a00]' },
  { cardCls: 'card-white-grid min-h-[200px] w-[220px] pt-[25px] px-[15px] pb-[15px]', textCls: 'text-[#204020]', padCls: 'pad-white-grid', inkCls: 'text-[#204020]' },
  { cardCls: 'card-green-lined min-h-[200px] w-[200px] pt-[25px] px-[15px] pb-[15px]', textCls: 'text-[#006600]', padCls: 'pad-green-lined', inkCls: 'text-[#006600]' },
  { cardCls: 'card-blue-dot min-h-[200px] w-[200px] pt-[25px] px-[15px] pb-[15px]', textCls: 'text-[#003366]', padCls: 'pad-blue-dot', inkCls: 'text-[#003366]' },
  { cardCls: 'card-orange-ruled min-h-[200px] w-[200px] pt-[25px] px-[15px] pb-[15px]', textCls: 'text-[#6a3000]', padCls: 'pad-orange-ruled', inkCls: 'text-[#6a3000]' },
  { cardCls: 'card-kraft min-h-[200px] w-[220px] pt-[25px] px-[15px] pb-[15px]', textCls: 'text-[#3a2a1a]', padCls: 'pad-kraft', inkCls: 'text-[#3a2a1a]' },
  { cardCls: 'card-pink-lined min-h-[200px] w-[220px] pt-[25px] px-[15px] pb-[15px]', textCls: 'text-[#5a2040]', padCls: 'pad-pink-lined', inkCls: 'text-[#5a2040]' },
  { cardCls: 'card-lavender-diag min-h-[200px] w-[200px] pt-[25px] px-[15px] pb-[15px]', textCls: 'text-[#4a2080]', padCls: 'pad-lavender-diag', inkCls: 'text-[#4a2080]' },
  { cardCls: 'card-mint-check min-h-[200px] w-[210px] pt-[25px] px-[15px] pb-[15px]', textCls: 'text-[#1a5a4a]', padCls: 'pad-mint-check', inkCls: 'text-[#1a5a4a]' },
  { cardCls: 'card-cream-cross min-h-[200px] w-[210px] pt-[25px] px-[15px] pb-[15px]', textCls: 'text-[#6a4a00]', padCls: 'pad-cream-cross', inkCls: 'text-[#6a4a00]' },
  { cardCls: 'card-sky-ruled min-h-[200px] w-[220px] pt-[30px] px-[15px] pb-[15px]', textCls: 'text-[#1a3a6a]', padCls: 'pad-sky-ruled', inkCls: 'text-[#1a3a6a]' },
];
const PIN_COLORS = ['pin-red', 'pin-blue', 'pin-yellow', 'pin-metal'];
const ROTATIONS = [3, -1, -4, 1, -3, 2, 6, -2];

const TOTAL_STYLES = CARD_STYLES.length;
const cardStyle = (s) => CARD_STYLES[(Number(s) || 0) % TOTAL_STYLES];

// 避免连续新建出相同样式
let lastStyle = -1;
const randomStyle = () => {
  let s;
  do { s = Math.floor(Math.random() * TOTAL_STYLES); } while (s === lastStyle);
  lastStyle = s;
  return s;
};

const currentDate = computed(() =>
  new Date().toLocaleDateString(locale.value === 'en' ? 'en-US' : 'zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '/')
);

const fetchNotes = async () => {
  try {
    loading.value = true;
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(PAGE_SIZE) });
    const res = await fetch(`${API_BASE}/list?${params.toString()}`);
    const data = await res.json();
    notes.value = data.items || [];
    total.value = Number(data.total || 0);
    totalPages.value = Number(data.totalPages || 1);
    if (page.value > totalPages.value) { page.value = totalPages.value; return fetchNotes(); }
  } catch (e) { error.value = e.message || t('notebook_load_failed'); }
  finally { loading.value = false; }
};

const openEditor = (note) => {
  editingNoteId.value = note?.id || null;
  editorDraft.value = note?.content || '';
  editorStyle.value = note ? (Number(note.style) || 0) : randomStyle();
  aiDrawerOpen.value = false;
  aiLoading.value = false;
  aiResult.value = '';
  view.value = 'editor';
};

const backToList = () => { view.value = 'list'; editingNoteId.value = null; editorDraft.value = ''; aiDrawerOpen.value = false; aiResult.value = ''; };

const saveEditor = async () => {
  const content = editorDraft.value.trim();
  if (!content || saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    const url = editingNoteId.value ? `${API_BASE}/update` : `${API_BASE}/create`;
    const body = editingNoteId.value
      ? { id: editingNoteId.value, content }
      : { content, style: editorStyle.value };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    page.value = 1;
    await fetchNotes();
    backToList();
  } catch (e) { error.value = e.message || t('notebook_create_failed'); }
  finally { saving.value = false; }
};

const confirmDelete = async () => {
  showDeleteConfirm.value = false;
  if (!editingNoteId.value) return;
  await deleteNote(editingNoteId.value);
  backToList();
};

const deleteNote = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await fetchNotes();
  } catch (e) { error.value = e.message || t('notebook_delete_failed'); }
};

const goPrevPage = async () => { if (page.value > 1 && !loading.value) { page.value--; await fetchNotes(); } };
const goNextPage = async () => { if (page.value < totalPages.value && !loading.value) { page.value++; await fetchNotes(); } };

const buildOptimizePrompt = (lang, content) => {
  if (lang === 'en') {
    return [
      'You are a writing editor.',
      'Polish the following text to be clearer and more professional while preserving original meaning.',
      'Output only the polished text. No explanation, no prefix, no markdown.',
      '',
      'Original text:',
      content
    ].join('\n');
  }
  return [
    '你是一位文字润色专家。',
    '请润色以下文字，使其更通顺、更专业，同时保持原意不变。',
    '只输出润色后的正文，不要解释、不要前缀、不要 markdown。',
    '',
    '原文：',
    content
  ].join('\n');
};

const startOptimize = async () => {
  const content = editorDraft.value.trim();
  if (!content || aiLoading.value) return;
  aiLoading.value = true;
  aiResult.value = '';
  aiDrawerOpen.value = true;
  try {
    const lang = locale.value === 'en' ? 'en' : 'zh';
    const res = await fetch(`${API_BASE}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        taskTitle: lang === 'en' ? 'Note polish' : '笔记润色',
        prompt: buildOptimizePrompt(lang, content)
      })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
    aiResult.value = data.result || '';
  } catch (e) {
    error.value = e.message || t('notebook_optimize_failed');
    aiDrawerOpen.value = false;
  } finally {
    aiLoading.value = false;
  }
};

const applyAI = () => {
  if (aiResult.value) editorDraft.value = aiResult.value;
  closeAI();
};

const closeAI = () => {
  aiDrawerOpen.value = false;
  aiResult.value = '';
};

const formatTime = (v) => {
  if (!v) return '';
  const d = new Date(v.replace(' ', 'T'));
  if (isNaN(d)) return v;
  const diff = Date.now() - d;
  if (diff < 60000) return t('notebook_just_now');
  if (diff < 3600000) return t('notebook_minutes_ago', { n: Math.floor(diff / 60000) });
  if (diff < 86400000) return t('notebook_hours_ago', { n: Math.floor(diff / 3600000) });
  if (diff < 604800000) return t('notebook_days_ago', { n: Math.floor(diff / 86400000) });
  return d.toLocaleDateString(locale.value === 'en' ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric' });
};

onMounted(() => {
  fetchNotes();
  chatPanel.setContext({ scene: 'notebook', label: t('app_sidebar_notebook') });
  chatPanel.setQuickMessages([t('notebook_chat_quick_1'), t('notebook_chat_quick_2'), t('notebook_chat_quick_3')]);
});
onUnmounted(() => { chatPanel.clearContext(); chatPanel.setQuickMessages([]); });
</script>

<style scoped>
.app-frame { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; background: var(--bg); }

/* ── 拟物化顶栏: 深色木框条 (软木板的相框上沿) ── */
.app-frame > .topbar {
  flex: none;
  height: 64px;
  display: flex;
  align-items: center;
  padding: 8px 16px;
  position: relative;
  z-index: 5;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 20%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.2) 100%),
    repeating-linear-gradient(90deg, rgba(255,240,210,0.06) 0 1px, rgba(80,50,20,0.04) 1px 2px, transparent 2px 5px),
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='w'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8 3' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.25  0 0 0 0 0.15  0 0 0 0 0.06  0 0 0 0.12 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23w)'/%3E%3C/svg%3E"),
    linear-gradient(180deg, #c49a6c 0%, #a67c52 50%, #8a6038 100%);
  background-blend-mode: normal, overlay, multiply, normal;
  box-shadow:
    inset 0 1px 0 rgba(255,235,200,0.4),
    inset 0 -1px 0 rgba(60,30,0,0.35),
    0 5px 12px -3px rgba(0,0,0,0.4),
    0 2px 0 rgba(0,0,0,0.2);
}
/* 底部细木纹装饰线 */
.app-frame > .topbar::after {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 3px;
  background: linear-gradient(180deg, rgba(80,50,20,0.3) 0%, rgba(120,80,40,0.4) 50%, rgba(180,140,80,0.2) 100%);
  pointer-events: none;
}

.app-frame > .topbar .left-spacer { width: 8px; }
.app-frame > .topbar .brand { flex: 1; min-width: 0; margin: 0 4px 0 12px; }
.app-frame > .topbar .brand .name {
  font-family: 'STKaiti', 'KaiTi', 'PingFang SC', serif;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: #3a2210;
  text-shadow:
    0 1px 0 rgba(255,230,180,0.5),
    0 -1px 0 rgba(40,20,0,0.3);
}
.app-frame > .topbar .right { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.app-frame > .topbar :deep(.icon-btn),
.app-frame > .topbar :deep(button) { color: #4a3018; }
.app-frame > .topbar :deep(.icon-btn:hover),
.app-frame > .topbar :deep(button:hover) { background: rgba(60,30,0,0.1); }

.notebook-main { flex: 1; min-height: 0; min-width: 0; display: flex; }

@media (max-width: 720px) {
  .app-frame > .topbar { padding: 8px; height: 56px; }
  .app-frame > .topbar .brand .name { font-size: 17px; letter-spacing: 0.16em; }
}
</style>
<style>
/* ── 软木板纹理（SVG噪声+暗角，Tailwind无法实现） ── */
.cork-surface {
  background-color: #b5835a;
  background-image:
    radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.5) 100%),
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.3'/%3E%3C/svg%3E");
  box-shadow: inset 0 0 30px rgba(0,0,0,0.8);
}

/* ── 图钉颜色（radial-gradient） ── */
.pin-red { background: radial-gradient(circle at 30% 30%, #ff5252, #b71c1c); }
.pin-blue { background: radial-gradient(circle at 30% 30%, #448aff, #0d47a1); }
.pin-yellow { background: radial-gradient(circle at 30% 30%, #ffd740, #ff6f00); }
.pin-metal { background: radial-gradient(circle at 30% 30%, #eceff1, #78909c); }

/* ── 8种卡片纹理（每种都有线条/纹理，不再有纯色） ── */

/* 0: 黄色信笺 - 蓝横线 + 红边距 + 撕裂顶边 */
.card-yellow-lined {
  background-color: #fdf5d3;
  background-image: repeating-linear-gradient(180deg, transparent 0, transparent 24px, #a4c8e1 24px, #a4c8e1 25px);
  box-shadow: 2px 4px 10px rgba(0,0,0,0.4);
  border-radius: 2px 2px 4px 6px;
}
.card-yellow-lined::before {
  content: ''; position: absolute; top: -4px; left: 0; right: 0; height: 8px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='8'%3E%3Cpath d='M0 8 L4 2 L8 6 L12 0 L16 8 Z' fill='%23fdf5d3'/%3E%3C/svg%3E") repeat-x;
}
.card-yellow-lined::after {
  content: ''; position: absolute; top: 4px; bottom: 0; left: 30px; width: 1px;
  background: rgba(220,100,100,0.4); z-index: -1;
}

/* 1: 粉色方格纸 */
.card-pink-grid {
  background-color: #ffcdd2;
  background-image:
    linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px);
  background-size: 18px 18px;
  box-shadow: 2px 4px 6px rgba(0,0,0,0.25);
  border-radius: 2px;
}
.card-pink-grid::after {
  content: ''; position: absolute; z-index: -1; bottom: 5px; right: 5px;
  width: 50%; height: 20px; box-shadow: 4px 10px 10px rgba(0,0,0,0.3); transform: rotate(4deg);
}

/* 2: 白色方格纸 - 工程网格 */
.card-white-grid {
  background-color: #fafafa;
  background-image:
    linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px);
  background-size: 15px 15px;
  box-shadow: 2px 4px 8px rgba(0,0,0,0.3);
  border-radius: 1px;
}

/* 3: 绿色横线纸 */
.card-green-lined {
  background-color: #c8e6c9;
  background-image: repeating-linear-gradient(180deg, transparent 0, transparent 22px, rgba(0,80,0,0.12) 22px, rgba(0,80,0,0.12) 23px);
  box-shadow: 2px 4px 6px rgba(0,0,0,0.25);
  border-radius: 2px;
}
.card-green-lined::after {
  content: ''; position: absolute; z-index: -1; bottom: 5px; right: 5px;
  width: 50%; height: 20px; box-shadow: 4px 10px 10px rgba(0,0,0,0.3); transform: rotate(4deg);
}

/* 4: 蓝色点阵纸 */
.card-blue-dot {
  background-color: #b3e5fc;
  background-image: radial-gradient(circle, rgba(0,50,100,0.12) 1px, transparent 1px);
  background-size: 12px 12px;
  box-shadow: 2px 4px 6px rgba(0,0,0,0.25);
  border-radius: 2px;
}
.card-blue-dot::after {
  content: ''; position: absolute; z-index: -1; bottom: 5px; right: 5px;
  width: 50%; height: 20px; box-shadow: 4px 10px 10px rgba(0,0,0,0.3); transform: rotate(4deg);
}

/* 5: 橙色竖线纸 */
.card-orange-ruled {
  background-color: #ffe0b2;
  background-image: repeating-linear-gradient(90deg, transparent 0, transparent 20px, rgba(180,100,0,0.1) 20px, rgba(180,100,0,0.1) 21px);
  box-shadow: 2px 4px 6px rgba(0,0,0,0.25);
  border-radius: 2px;
}
.card-orange-ruled::after {
  content: ''; position: absolute; z-index: -1; bottom: 5px; right: 5px;
  width: 50%; height: 20px; box-shadow: 4px 10px 10px rgba(0,0,0,0.3); transform: rotate(4deg);
}

/* 6: 牛皮纸 - 噪声纹理 */
.card-kraft {
  background-color: #c9a96e;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E");
  box-shadow: 2px 4px 8px rgba(0,0,0,0.35);
  border-radius: 2px;
}

/* 7: 粉色信笺 - 横线 + 左边距 */
.card-pink-lined {
  background-color: #fce4ec;
  background-image: repeating-linear-gradient(180deg, transparent 0, transparent 24px, #e8a0b0 24px, #e8a0b0 25px);
  box-shadow: 2px 4px 8px rgba(0,0,0,0.3);
  border-radius: 2px;
}
.card-pink-lined::after {
  content: ''; position: absolute; top: 4px; bottom: 0; left: 30px; width: 1px;
  background: rgba(200,80,120,0.3); z-index: -1;
}

/* 8: 薰衣草斜线纸 */
.card-lavender-diag {
  background-color: #e8daef;
  background-image: repeating-linear-gradient(135deg, transparent 0, transparent 10px, rgba(100,50,150,0.08) 10px, rgba(100,50,150,0.08) 11px);
  box-shadow: 2px 4px 6px rgba(0,0,0,0.25);
  border-radius: 2px;
}
.card-lavender-diag::after {
  content: ''; position: absolute; z-index: -1; bottom: 5px; right: 5px;
  width: 50%; height: 20px; box-shadow: 4px 10px 10px rgba(0,0,0,0.3); transform: rotate(4deg);
}

/* 9: 薄荷棋盘格纸 */
.card-mint-check {
  background-color: #c8f7e1;
  background-image:
    linear-gradient(45deg, rgba(0,80,60,0.06) 25%, transparent 25%, transparent 75%, rgba(0,80,60,0.06) 75%),
    linear-gradient(45deg, rgba(0,80,60,0.06) 25%, transparent 25%, transparent 75%, rgba(0,80,60,0.06) 75%);
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
  box-shadow: 2px 4px 6px rgba(0,0,0,0.25);
  border-radius: 2px;
}

/* 10: 奶油十字纹纸 */
.card-cream-cross {
  background-color: #faf0d8;
  background-image:
    radial-gradient(circle, rgba(160,120,40,0.12) 1px, transparent 1px),
    linear-gradient(rgba(160,120,40,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(160,120,40,0.06) 1px, transparent 1px);
  background-size: 16px 16px;
  box-shadow: 2px 4px 8px rgba(0,0,0,0.3);
  border-radius: 2px;
}

/* 11: 天蓝横线信笺 - 类似黄色信笺但天蓝底 + 深蓝横线 + 撕裂顶边 */
.card-sky-ruled {
  background-color: #dceefb;
  background-image: repeating-linear-gradient(180deg, transparent 0, transparent 24px, #90b8d8 24px, #90b8d8 25px);
  box-shadow: 2px 4px 10px rgba(0,0,0,0.4);
  border-radius: 2px 2px 4px 6px;
}
.card-sky-ruled::before {
  content: ''; position: absolute; top: -4px; left: 0; right: 0; height: 8px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='8'%3E%3Cpath d='M0 8 L4 2 L8 6 L12 0 L16 8 Z' fill='%23dceefb'/%3E%3C/svg%3E") repeat-x;
}
.card-sky-ruled::after {
  content: ''; position: absolute; top: 4px; bottom: 0; left: 30px; width: 1px;
  background: rgba(80,120,180,0.35); z-index: -1;
}

/* ── 夹板编辑器（多层阴影+渐变，Tailwind写不了或太长） ── */
.clipboard-board {
  background: linear-gradient(135deg, #5c412a, #3a2515);
  box-shadow: inset 0 2px 5px rgba(255,255,255,0.1), inset 0 -4px 10px rgba(0,0,0,0.4), 10px 20px 30px rgba(0,0,0,0.8);
}
.clip-base {
  background: linear-gradient(180deg, #d4d4d4, #a3a3a3 40%, #888);
  box-shadow: inset 0 2px 2px rgba(255,255,255,0.8), 0 4px 6px rgba(0,0,0,0.4);
}
.clip-jaw {
  background: linear-gradient(180deg, #f0f0f0, #b3b3b3 50%, #999);
  box-shadow: inset 0 2px 3px rgba(255,255,255,0.9), 0 8px 10px rgba(0,0,0,0.5);
}
.rivet {
  background: radial-gradient(circle at 35% 35%, #fff, #999);
  box-shadow: inset 0 -1px 2px rgba(0,0,0,0.5), 0 2px 3px rgba(0,0,0,0.5);
}

/* 编辑器纸张基础 */
.legal-pad {
  box-shadow: inset 0 0 40px rgba(0,0,0,0.08);
}

/* 0: 黄色信笺 */
.pad-yellow-lined {
  background-color: #fdf5d3;
  background-image: repeating-linear-gradient(180deg, transparent 0, transparent 29px, #a4c8e1 29px, #a4c8e1 30px);
  background-position: 0 50px;
}
.pad-yellow-lined::after {
  content: ''; position: absolute; top: 0; bottom: 0; left: 45px; width: 2px;
  background: rgba(220,100,100,0.5); box-shadow: 4px 0 0 rgba(220,100,100,0.15); pointer-events: none;
}

/* 1: 粉色方格 */
.pad-pink-grid {
  background-color: #ffcdd2;
  background-image: linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px);
  background-size: 30px 30px; background-position: 0 50px;
}

/* 2: 白色网格 */
.pad-white-grid {
  background-color: #fafafa;
  background-image: linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px);
  background-size: 30px 30px; background-position: 0 50px;
}

/* 3: 绿色横线 */
.pad-green-lined {
  background-color: #c8e6c9;
  background-image: repeating-linear-gradient(180deg, transparent 0, transparent 29px, rgba(0,80,0,0.12) 29px, rgba(0,80,0,0.12) 30px);
  background-position: 0 50px;
}

/* 4: 蓝色点阵 */
.pad-blue-dot {
  background-color: #b3e5fc;
  background-image: radial-gradient(circle, rgba(0,50,100,0.12) 1px, transparent 1px);
  background-size: 20px 20px; background-position: 0 50px;
}

/* 5: 橙色竖线 */
.pad-orange-ruled {
  background-color: #ffe0b2;
  background-image: repeating-linear-gradient(90deg, transparent 0, transparent 28px, rgba(180,100,0,0.1) 28px, rgba(180,100,0,0.1) 29px);
}

/* 6: 牛皮纸 */
.pad-kraft {
  background-color: #c9a96e;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E");
}

/* 7: 粉色横线 */
.pad-pink-lined {
  background-color: #fce4ec;
  background-image: repeating-linear-gradient(180deg, transparent 0, transparent 29px, #e8a0b0 29px, #e8a0b0 30px);
  background-position: 0 50px;
}
.pad-pink-lined::after {
  content: ''; position: absolute; top: 0; bottom: 0; left: 45px; width: 1px;
  background: rgba(200,80,120,0.3); pointer-events: none;
}

/* 8: 薰衣草斜线 */
.pad-lavender-diag {
  background-color: #e8daef;
  background-image: repeating-linear-gradient(135deg, transparent 0, transparent 14px, rgba(100,50,150,0.08) 14px, rgba(100,50,150,0.08) 15px);
}

/* 9: 薄荷棋盘格 */
.pad-mint-check {
  background-color: #c8f7e1;
  background-image:
    linear-gradient(45deg, rgba(0,80,60,0.06) 25%, transparent 25%, transparent 75%, rgba(0,80,60,0.06) 75%),
    linear-gradient(45deg, rgba(0,80,60,0.06) 25%, transparent 25%, transparent 75%, rgba(0,80,60,0.06) 75%);
  background-size: 30px 30px;
  background-position: 0 0, 15px 15px;
}

/* 10: 奶油十字纹 */
.pad-cream-cross {
  background-color: #faf0d8;
  background-image:
    radial-gradient(circle, rgba(160,120,40,0.12) 1px, transparent 1px),
    linear-gradient(rgba(160,120,40,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(160,120,40,0.06) 1px, transparent 1px);
  background-size: 24px 24px;
  background-position: 0 50px;
}

/* 11: 天蓝横线 */
.pad-sky-ruled {
  background-color: #dceefb;
  background-image: repeating-linear-gradient(180deg, transparent 0, transparent 29px, #90b8d8 29px, #90b8d8 30px);
  background-position: 0 50px;
}
.pad-sky-ruled::after {
  content: ''; position: absolute; top: 0; bottom: 0; left: 45px; width: 2px;
  background: rgba(80,120,180,0.4); box-shadow: 4px 0 0 rgba(80,120,180,0.12); pointer-events: none;
}

.pad-binding {
  background: linear-gradient(180deg, #111, #333, #111);
}

/* ── 底部绒面区域 ── */
.bottom-zone {
  background: linear-gradient(180deg, #3a1818, #2a0e0e);
  border-top: 3px solid #5a3020;
  box-shadow: inset 0 4px 12px rgba(0,0,0,0.6);
  background-image:
    repeating-linear-gradient(135deg, rgba(255,255,255,0.005) 0px, rgba(255,255,255,0.005) 1px, transparent 1px, transparent 3px);
}

/* AI 抽屉 */
.ai-drawer {
  max-height: 0;
  transition: max-height 0.4s ease;
}
.ai-drawer.show { max-height: 50vh; }

.ai-well {
  background: rgba(0,0,0,0.25);
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(255,255,255,0.03);
}

/* 删除确认弹窗 */
.ai-modal-backdrop {
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
}
.ai-modal-card {
  background: linear-gradient(180deg, #3a1818, #2a0e0e);
  box-shadow: 0 12px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05);
  background-image:
    repeating-linear-gradient(135deg, rgba(255,255,255,0.005) 0px, rgba(255,255,255,0.005) 1px, transparent 1px, transparent 3px);
}
.ai-modal-enter-active { transition: all 0.25s ease-out; }
.ai-modal-leave-active { transition: all 0.2s ease-in; }
.ai-modal-enter-from { opacity: 0; }
.ai-modal-enter-from .ai-modal-card { transform: scale(0.9); }
.ai-modal-leave-to { opacity: 0; }
.ai-modal-leave-to .ai-modal-card { transform: scale(0.9); }

.ai-tag::before {
  content: '';
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #e8c060, #a08030);
  box-shadow: 0 0 4px rgba(200,160,60,0.4);
}

.ai-body {
  color: rgba(220,200,160,0.75);
  max-height: 28vh;
}
.ai-body::-webkit-scrollbar { width: 3px; }
.ai-body::-webkit-scrollbar-thumb { background: rgba(200,160,80,0.15); border-radius: 2px; }

.quill-anim::before {
  content: '\270D'; font-size: 14px; position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  animation: quillWrite 1.2s ease-in-out infinite;
  filter: grayscale(0.3) brightness(0.8);
}
@keyframes quillWrite {
  0%,100% { transform: rotate(-5deg) translateY(0); }
  25% { transform: rotate(3deg) translateY(-2px); }
  50% { transform: rotate(-3deg) translateY(1px); }
  75% { transform: rotate(2deg) translateY(-1px); }
}
</style>
