<script setup>
// 笔记 — 极简版: 列表 + 全屏编辑器
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import * as api from '@/utils/api.js';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';

// ─── state ────────────────────────────────────────
const items = ref([]);
const loading = ref(false);
const errMsg = ref('');
const search = ref('');

// 编辑态: null = 列表模式, 否则是被编辑的 note 对象副本
const editing = ref(null);
const editingDirty = ref(false);
let saveTimer = null;

const titleEl = ref(null);
const bodyEl = ref(null);

// ─── computed ─────────────────────────────────────
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return items.value;
  return items.value.filter(
    (n) => (n.title || '').toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q)
  );
});
const pinnedItems = computed(() => filtered.value.filter((n) => n.pinned));
const otherItems  = computed(() => filtered.value.filter((n) => !n.pinned));

// ─── helpers ──────────────────────────────────────
function relTime(ts) {
  if (!ts) return '';
  const d = new Date(ts.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffH = (now - d) / 3600000;
  if (diffH < 1) return `${Math.max(1, Math.floor(diffH * 60))} 分钟前`;
  if (diffH < 24) return `${Math.floor(diffH)} 小时前`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} 天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function snippet(body, n = 100) {
  if (!body) return '';
  const t = body.replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
}
function setErr(label, e) { errMsg.value = `${label}: ${e?.message || e}`; }

// ─── 数据加载 ─────────────────────────────────────
async function loadList() {
  loading.value = true;
  try {
    const data = await api.get('/api/notes/list');
    items.value = data.items || [];
    errMsg.value = '';
  } catch (e) { setErr('加载失败', e); }
  loading.value = false;
}

// ─── 进入/退出编辑器 ─────────────────────────────
function openNote(item) {
  editing.value = { ...item };
  editingDirty.value = false;
  nextTick(() => {
    if (!editing.value.title && !editing.value.body) titleEl.value?.focus();
    else bodyEl.value?.focus();
  });
}

function newNote() {
  editing.value = { id: null, title: '', body: '', pinned: 0, created_at: '', updated_at: '' };
  editingDirty.value = false;
  nextTick(() => titleEl.value?.focus());
}

async function closeEditor() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (editing.value && editingDirty.value) await persistEditing();
  editing.value = null;
  editingDirty.value = false;
}

async function persistEditing() {
  const e = editing.value;
  if (!e) return;
  if (!e.id && !e.title.trim() && !e.body.trim()) return; // 空白新笔记不保存
  try {
    const r = await api.post('/api/notes/save', e);
    if (r?.item) editing.value = { ...editing.value, ...r.item };
    editingDirty.value = false;
    await loadList();
  } catch (err) { setErr('保存失败', err); }
}

// 编辑期间防抖自动保存
watch(() => editing.value && JSON.stringify({
  t: editing.value.title, b: editing.value.body, p: editing.value.pinned
}), (n, o) => {
  if (!editing.value || o === undefined) return;
  editingDirty.value = true;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => persistEditing(), 800);
});

// ─── 卡片操作 ─────────────────────────────────────
async function togglePin(item, ev) { ev?.stopPropagation();
  try { await api.post('/api/notes/pin', { id: item.id, pinned: item.pinned ? 0 : 1 }); await loadList(); }
  catch (e) { setErr('置顶失败', e); }
}
async function removeNote(item, ev) { ev?.stopPropagation();
  if (!confirm('删除这条笔记?')) return;
  try {
    await api.post('/api/notes/delete', { id: item.id });
    if (editing.value?.id === item.id) editing.value = null;
    await loadList();
  } catch (e) { setErr('删除失败', e); }
}

// ─── 键盘 ───────────────────────────────────────
function onKey(e) { if (e.key === 'Escape' && editing.value) closeEditor(); }

onMounted(() => {
  loadList();
  document.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
});
</script>

<template>
  <div class="app-frame bg-[#faf9f5]">

    <!-- ─── topbar ─── -->
    <header class="topbar">
      <button v-if="editing" class="icon-btn lg" title="返回列表" @click="closeEditor">
        <span class="msi">arrow_back</span>
      </button>
      <div v-if="!editing" class="brand"><span class="name">笔记</span></div>

      <!-- 列表态:搜索 -->
      <div v-if="!editing" class="search-pill">
        <span class="msi sm">search</span>
        <input v-model="search" type="text" placeholder="搜索笔记" />
      </div>

      <!-- 编辑态:操作 -->
      <div v-else class="edit-actions">
        <button class="icon-btn"
          :class="{ 'is-on': editing.pinned }"
          :title="editing.pinned ? '取消置顶' : '置顶'"
          @click="editing.pinned = editing.pinned ? 0 : 1">
          <span class="msi sm">push_pin</span>
        </button>
        <button v-if="editing.id" class="icon-btn" title="删除" @click="removeNote(editing, $event)">
          <span class="msi sm">delete</span>
        </button>
      </div>

      <div class="right">
        <ChatTrigger />
        <AppsTrigger />
      </div>
    </header>

    <section class="page">

      <!-- ─── 编辑器 ─── -->
      <div v-if="editing" class="editor">
        <div class="editor-paper">
          <input ref="titleEl" v-model="editing.title" class="ed-title" placeholder="标题" />
          <textarea ref="bodyEl" v-model="editing.body" class="ed-body" placeholder="开始写…" />
          <div class="ed-foot">
            <span v-if="editing.created_at">{{ relTime(editing.updated_at || editing.created_at) }}</span>
            <span v-else>新笔记</span>
            <span v-if="editingDirty" class="dirty">· 未保存</span>
            <span v-else-if="editing.id" class="saved">· 已保存</span>
          </div>
        </div>
      </div>

      <!-- ─── 列表 ─── -->
      <div v-else class="list-pane">
        <div class="new-row">
          <button class="new-btn" @click="newNote">
            <span class="msi sm">edit</span>
            <span>新笔记</span>
          </button>
        </div>

        <div v-if="errMsg" class="err">{{ errMsg }}</div>

        <div v-if="loading && !items.length" class="state">加载中…</div>
        <div v-else-if="!filtered.length" class="state">
          <span class="msi" style="font-size:42px">edit_note</span>
          <div class="state-title">{{ search ? '没有匹配的笔记' : '还没有笔记' }}</div>
          <div v-if="!search" class="state-sub">点上方「新笔记」开始</div>
        </div>

        <template v-else>
          <section v-if="pinnedItems.length" class="list-section">
            <div class="section-label">置顶</div>
            <ul class="list">
              <li v-for="n in pinnedItems" :key="`p-${n.id}`" class="row" @click="openNote(n)">
                <div class="row-main">
                  <div class="row-head">
                    <span v-if="n.pinned" class="msi xxs pin-mark">push_pin</span>
                    <h3 class="row-title">{{ n.title || '(无标题)' }}</h3>
                  </div>
                  <p v-if="n.body" class="row-snippet">{{ snippet(n.body) }}</p>
                  <div class="row-meta">
                    <span class="time">{{ relTime(n.updated_at) }}</span>
                  </div>
                </div>
                <div class="row-actions" @click.stop>
                  <button class="row-act" @click="togglePin(n, $event)" :title="n.pinned ? '取消置顶' : '置顶'">
                    <span class="msi xs">push_pin</span>
                  </button>
                  <button class="row-act danger" @click="removeNote(n, $event)" title="删除">
                    <span class="msi xs">delete</span>
                  </button>
                </div>
              </li>
            </ul>
          </section>

          <section v-if="otherItems.length" class="list-section">
            <div v-if="pinnedItems.length" class="section-label">其它</div>
            <ul class="list">
              <li v-for="n in otherItems" :key="n.id" class="row" @click="openNote(n)">
                <div class="row-main">
                  <div class="row-head">
                    <h3 class="row-title">{{ n.title || '(无标题)' }}</h3>
                  </div>
                  <p v-if="n.body" class="row-snippet">{{ snippet(n.body) }}</p>
                  <div class="row-meta">
                    <span class="time">{{ relTime(n.updated_at) }}</span>
                  </div>
                </div>
                <div class="row-actions" @click.stop>
                  <button class="row-act" @click="togglePin(n, $event)" title="置顶">
                    <span class="msi xs">push_pin</span>
                  </button>
                  <button class="row-act danger" @click="removeNote(n, $event)" title="删除">
                    <span class="msi xs">delete</span>
                  </button>
                </div>
              </li>
            </ul>
          </section>
        </template>
      </div>

    </section>
  </div>
</template>

<style scoped>
.app-frame { background: #faf9f5; }

/* ─── topbar ─── */
.topbar { flex: none; height: 64px; display: flex; align-items: center; padding: 8px 16px; gap: 8px; background: transparent; }
.brand { flex: none; margin: 0 4px 0 12px; }
.brand .name { font-size: 20px; font-weight: 500; letter-spacing: -0.01em; color: var(--text); }
.right { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.search-pill {
  flex: 1;
  display: flex; align-items: center; gap: 8px;
  max-width: 720px;
  height: 44px;
  padding: 0 16px;
  background: var(--bg-elev);
  border-radius: 22px;
  transition: background .15s, box-shadow .15s;
}
.search-pill:focus-within { background: #fff; box-shadow: var(--shadow-1); }
.search-pill .msi { color: var(--text-2); }
.search-pill input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font-size: 14.5px; color: var(--text); }
.edit-actions { flex: 1; display: flex; align-items: center; gap: 4px; }
.icon-btn.is-on { background: var(--accent-soft); color: var(--accent-fg); }
@media (max-width: 720px) { .search-pill { max-width: none; } .brand { display: none; } }

/* ─── main ─── */
.page { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; overflow-y: auto; }

/* ─── 列表 ─── */
.list-pane { padding: 16px 24px 60px; max-width: 920px; width: 100%; margin: 0 auto; }
@media (max-width: 720px) { .list-pane { padding: 12px 12px 40px; } }

.new-row { padding: 4px 0 16px; }
.new-btn {
  display: inline-flex; align-items: center; gap: 8px;
  height: 40px; padding: 0 18px;
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 22px;
  font-size: 14px; font-weight: 500;
  color: var(--text);
  cursor: pointer;
  box-shadow: var(--shadow-1);
  transition: box-shadow .12s, background .12s;
}
.new-btn:hover { background: #fafbfc; box-shadow: var(--shadow-2); }
.new-btn .msi { color: var(--accent); }

.list-section + .list-section { margin-top: 24px; }
.section-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: var(--text-2); text-transform: uppercase; margin: 0 4px 8px; }

.list { list-style: none; margin: 0; padding: 0; background: #fff; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.row {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 14px 18px;
  cursor: pointer;
  transition: background .12s;
  border-bottom: 1px solid var(--line-soft);
}
.row:last-child { border-bottom: 0; }
.row:hover { background: var(--bg-hover); }

.row-main { flex: 1; min-width: 0; }
.row-head { display: flex; align-items: center; gap: 6px; }
.pin-mark { color: var(--accent); flex: none; }
.row-title { margin: 0; font-size: 15px; font-weight: 600; color: var(--text); line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-snippet { margin: 2px 0 0; font-size: 13px; line-height: 1.55; color: var(--text-2); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.row-meta { margin-top: 6px; display: flex; align-items: center; gap: 10px; font-size: 11.5px; color: var(--text-3); }
.row-meta .time { font-variant-numeric: tabular-nums; }

.row-actions { display: flex; gap: 0; flex: none; opacity: 0; transition: opacity .12s; }
.row:hover .row-actions { opacity: 1; }
.row-act {
  width: 30px; height: 30px;
  display: grid; place-items: center;
  border: 0; background: transparent;
  border-radius: 50%;
  color: var(--text-3);
  cursor: pointer;
  transition: background .12s, color .12s;
}
.row-act:hover { background: rgba(0,0,0,0.06); color: var(--text); }
.row-act.danger:hover { background: color-mix(in srgb, var(--bad) 12%, transparent); color: var(--bad); }
@media (max-width: 720px) {
  .row-actions { opacity: 1; }
  .row-act { width: 28px; height: 28px; }
}

/* ─── 状态 / 错误 ─── */
.err { padding: 10px 14px; background: #fce8e6; color: var(--bad); border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
.state { padding: 80px 20px; text-align: center; color: var(--text-2); }
.state .msi { color: var(--text-3); display: block; margin: 0 auto 12px; }
.state-title { font-size: 16px; font-weight: 500; color: var(--text); }
.state-sub { margin-top: 4px; font-size: 13px; color: var(--text-3); }

/* ─── 编辑器 ─── */
.editor { flex: 1; min-height: 0; padding: 24px 32px 60px; overflow-y: auto; display: flex; justify-content: center; }
.editor-paper { width: 100%; max-width: 760px; display: flex; flex-direction: column; gap: 16px; }
.ed-title {
  width: 100%;
  border: 0; outline: 0; background: transparent;
  font: inherit;
  font-size: 28px; font-weight: 700; letter-spacing: -0.01em;
  color: var(--text);
  padding: 6px 0; resize: none;
}
.ed-title::placeholder { color: var(--text-3); font-weight: 600; }
.ed-body {
  flex: 1; width: 100%;
  border: 0; outline: 0; background: transparent;
  font: inherit;
  font-size: 16px; line-height: 1.7;
  color: var(--text);
  resize: none;
  min-height: 60vh;
}
.ed-body::placeholder { color: var(--text-3); }
.ed-foot { font-size: 11.5px; color: var(--text-3); display: flex; gap: 6px; padding-top: 4px; border-top: 1px solid var(--line-soft); }
.ed-foot .dirty { color: var(--warn); }
.ed-foot .saved { color: var(--good); opacity: 0.7; }
@media (max-width: 720px) {
  .editor { padding: 12px 16px 40px; }
  .ed-title { font-size: 22px; }
  .ed-body { font-size: 15px; }
}
</style>
