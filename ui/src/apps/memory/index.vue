<template>
  <div class="app-frame">
    <header class="topbar">
      <div class="brand"><span class="name">记忆</span></div>
      <div class="right">
        <ChatTrigger />
        <AppsTrigger />
      </div>
    </header>
  <div class="relative flex flex-1 min-h-0 flex-col" style="background:repeating-linear-gradient(#faf6ef 0px,#faf6ef 31px,rgba(170,150,120,0.08) 31px,rgba(170,150,120,0.08) 32px),linear-gradient(135deg,#faf5eb,#f5efe3);color:#2a1f13">
    <!-- Red binding lines -->
    <div class="pointer-events-none absolute bottom-0 left-10 top-0 z-[1] w-[1.5px]" style="background:rgba(220,80,80,0.12)"></div>
    <div class="pointer-events-none absolute bottom-0 left-[44px] top-0 z-[1] w-px" style="background:rgba(220,80,80,0.08)"></div>

    <!-- Header -->
    <div class="relative z-[2] flex h-14 shrink-0 items-center justify-between border-b-2 pl-14 pr-5" style="border-color:rgba(170,150,120,0.1)">
      <div class="flex items-center gap-1">
        <button
          v-for="t in tabs" :key="t.key"
          class="rounded-lg px-2.5 py-[5px] text-[15px] font-semibold transition-all"
          :style="tab === t.key
            ? 'background:rgba(140,120,80,0.1);color:rgba(80,55,30,0.75)'
            : 'color:rgba(100,80,50,0.35)'"
          :class="tab !== t.key && 'hover:text-[rgba(80,55,30,0.55)]'"
          style="font-family:'Caveat','Segoe Print','Comic Sans MS',cursive"
          @click="tab = t.key"
        >{{ t.label }}<span v-if="t.count" class="ml-1 text-[12px] opacity-45">{{ t.count }}</span></button>
      </div>
      <div class="flex items-center gap-1.5">
        <button class="flex h-8 w-8 items-center justify-center rounded-lg text-[16px] transition-all hover:bg-[rgba(92,67,50,0.07)]" style="color:rgba(42,31,19,0.35)" @click="loadItems">↻</button>
        <button class="rounded-[20px] border-2 border-dashed px-[18px] py-[7px] text-[17px] font-semibold transition-all hover:scale-[1.03] hover:border-[rgba(140,120,80,0.5)] hover:bg-[rgba(255,255,255,0.8)]" style="border-color:rgba(140,120,80,0.3);background:rgba(255,255,255,0.5);color:rgba(100,75,40,0.6);font-family:'Caveat','Segoe Print',cursive;backdrop-filter:blur(4px)" @click="openEditor(null)">+ 新增记忆</button>
      </div>
    </div>

    <!-- Scroll -->
    <div class="relative z-[2] min-h-0 flex-1 overflow-y-auto py-5 pl-[52px] pr-4 [scrollbar-width:thin]">

      <!-- Loading -->
      <div v-if="loading && !items.length" class="flex items-center justify-center py-16">
        <div class="h-5 w-5 animate-spin rounded-full border-2 border-[rgba(92,67,50,0.12)] border-t-[#5c4332]"></div>
      </div>

      <!-- Empty -->
      <div v-else-if="!items.length" class="flex flex-col items-center px-6 py-16 text-center">
        <div class="mb-3 text-[52px] opacity-65">📒</div>
        <div class="mb-1 text-[22px] font-bold" style="color:rgba(80,55,30,0.5);font-family:'Caveat','Segoe Print',cursive">空白记忆本</div>
        <div class="mb-5 text-[16px]" style="color:rgba(140,120,90,0.4);font-family:'Caveat','Segoe Print',cursive">把希望 AI 一直记住的事写下来</div>
        <button class="rounded-[20px] border-2 border-dashed px-5 py-2 text-[17px] font-semibold transition-all hover:scale-[1.03] hover:bg-[rgba(255,255,255,0.8)]" style="border-color:rgba(140,120,80,0.3);background:rgba(255,255,255,0.5);color:rgba(100,75,40,0.6);font-family:'Caveat','Segoe Print',cursive" @click="openEditor(null)">写第一条记忆</button>
      </div>

      <!-- Cards grid -->
      <template v-else>
        <div v-if="!filteredItems.length" class="flex flex-col items-center px-6 py-14 text-center">
          <div class="text-[16px] font-semibold" style="color:rgba(80,55,30,0.4);font-family:'Caveat','Segoe Print',cursive">这个分类下还没有内容</div>
        </div>
        <div v-else class="flex flex-wrap items-start gap-4">
          <div v-for="it in filteredItems" :key="it.id" class="w-[calc(50%-8px)]">
            <MemoryCard :item="it" @edit="openEditor(it)" @toggle-pin="togglePin(it)" @toggle-enable="toggleEnable(it)" @delete="deleteItem(it)" />
          </div>
        </div>
      </template>
    </div>

    <!-- Editor Modal -->
    <Transition name="modal">
      <div v-if="editorOpen" class="absolute inset-0 z-30 flex items-center justify-center px-5 py-6" style="background:rgba(60,45,25,0.25);backdrop-filter:blur(8px)" @click.self="closeEditor">
        <div class="relative flex w-full max-w-[500px] flex-col overflow-hidden rounded-[6px]" style="background:#fef9e8;box-shadow:0 20px 60px rgba(60,40,10,0.2),0 0 0 1px rgba(0,0,0,0.04);max-height:85%;background-image:repeating-linear-gradient(0deg,transparent 0px,transparent 27px,rgba(0,0,0,0.025) 27px,rgba(0,0,0,0.025) 28px)">
          <div class="flex items-center justify-between px-6 pb-3 pt-5" style="border-bottom:1px solid rgba(170,150,120,0.12)">
            <div class="text-[22px] font-bold" style="color:rgba(80,55,30,0.7);font-family:'Caveat','Segoe Print',cursive">{{ editId ? '编辑记忆' : '新建记忆' }}</div>
            <button class="flex h-7 w-7 items-center justify-center rounded-full text-[16px] transition-all hover:bg-[rgba(0,0,0,0.06)]" style="color:rgba(100,80,50,0.4);background:rgba(0,0,0,0.04)" @click="closeEditor">×</button>
          </div>
          <div class="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-6 py-4 [scrollbar-width:thin]">
            <div>
              <div class="mb-1 text-[14px] font-semibold" style="color:rgba(120,100,60,0.45);font-family:'Caveat','Segoe Print',cursive">标题</div>
              <input ref="titleInput" v-model="editTitle" placeholder="起个能让自己一眼想起来的名字" class="w-full rounded-md border-[1.5px] px-3.5 py-2.5 text-[22px] font-bold outline-none transition-all focus:border-[rgba(170,150,100,0.4)] focus:shadow-[0_0_0_3px_rgba(170,150,100,0.08)]" style="border-color:rgba(170,150,100,0.2);background:rgba(255,255,255,0.6);color:rgba(60,40,15,0.85);font-family:'Caveat','Segoe Print',cursive" @keydown.meta.s.prevent="saveEdit" @keydown.ctrl.s.prevent="saveEdit" />
            </div>
            <div>
              <div class="mb-1 text-[14px] font-semibold" style="color:rgba(120,100,60,0.45);font-family:'Caveat','Segoe Print',cursive">简介</div>
              <input v-model="editDescription" placeholder="一两句话说明这条记忆是干嘛的(可选)" class="w-full rounded-md border-[1.5px] px-3.5 py-2 text-[17px] outline-none transition-all focus:border-[rgba(170,150,100,0.4)] focus:shadow-[0_0_0_3px_rgba(170,150,100,0.08)]" style="border-color:rgba(170,150,100,0.2);background:rgba(255,255,255,0.6);color:rgba(60,40,15,0.85);font-family:'Caveat','Segoe Print',cursive" @keydown.meta.s.prevent="saveEdit" @keydown.ctrl.s.prevent="saveEdit" />
              <div class="mt-1 text-[12px]" style="color:rgba(140,120,80,0.3);font-family:'Caveat','Segoe Print',cursive">AI 看不到这一段, 只是给你做归类</div>
            </div>
            <div class="flex min-h-0 flex-1 flex-col">
              <div class="mb-1 flex items-center justify-between">
                <div class="text-[14px] font-semibold" style="color:rgba(120,100,60,0.45);font-family:'Caveat','Segoe Print',cursive">正文</div>
                <div class="text-[12px] tabular-nums" style="color:rgba(140,120,80,0.25);font-family:'Caveat',cursive">{{ editContent.length }} 字</div>
              </div>
              <textarea v-model="editContent" placeholder="希望 AI 永远记住的事…" class="w-full flex-1 resize-y rounded-md border-[1.5px] px-3.5 py-2.5 text-[16px] leading-[1.7] outline-none transition-all focus:border-[rgba(170,150,100,0.4)] focus:shadow-[0_0_0_3px_rgba(170,150,100,0.08)]" style="border-color:rgba(170,150,100,0.2);background:rgba(255,255,255,0.6);color:rgba(60,40,15,0.85);font-family:'Caveat','Segoe Print',cursive;min-height:180px" @keydown.meta.s.prevent="saveEdit" @keydown.ctrl.s.prevent="saveEdit"></textarea>
              <div class="mt-1 text-[12px]" style="color:rgba(140,120,80,0.28);font-family:'Caveat','Segoe Print',cursive">AI 会把启用的记忆拼进 system prompt</div>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 px-6 pb-5 pt-3" style="border-top:1px solid rgba(170,150,120,0.1)">
            <button class="rounded-[20px] border-[1.5px] px-[18px] py-[7px] text-[16px] font-semibold transition-all hover:bg-[rgba(255,255,255,0.8)]" style="border-color:rgba(170,150,100,0.2);background:rgba(255,255,255,0.5);color:rgba(100,80,50,0.5);font-family:'Caveat','Segoe Print',cursive" @click="closeEditor">取消</button>
            <button class="rounded-[20px] border-none px-[22px] py-[8px] text-[16px] font-bold transition-all hover:translate-y-[-1px] disabled:opacity-30" style="background:rgba(120,85,45,0.75);color:#fef6e0;box-shadow:0 2px 6px rgba(100,70,30,0.2);font-family:'Caveat','Segoe Print',cursive" :disabled="!canSave || saving" @click="saveEdit">{{ saving ? '保存中…' : '保存' }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';
import MemoryCard from './components/MemoryCard.vue';

const loading = ref(false);
const items = ref([]);
const tab = ref('all');
const editorOpen = ref(false);
const editId = ref(null);
const editTitle = ref('');
const editDescription = ref('');
const editContent = ref('');
const saving = ref(false);
const titleInput = ref(null);

const pinned = computed(() => items.value.filter(i => i.pinned && i.enabled));
const enabled = computed(() => items.value.filter(i => !i.pinned && i.enabled));
const disabled = computed(() => items.value.filter(i => !i.enabled));
const canSave = computed(() => editTitle.value.trim() && editContent.value.trim());

const tabs = computed(() => [
  { key: 'all', label: '全部', count: items.value.length },
  { key: 'pinned', label: '置顶', count: pinned.value.length },
  { key: 'enabled', label: '启用中', count: enabled.value.length },
  { key: 'disabled', label: '已停用', count: disabled.value.length },
]);

const filteredItems = computed(() => {
  if (tab.value === 'pinned') return pinned.value;
  if (tab.value === 'enabled') return enabled.value;
  if (tab.value === 'disabled') return disabled.value;
  return items.value;
});

const request = async (url, options = {}) => {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.message || `${res.status}`);
  return data;
};
const post = (url, body) => request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const loadItems = async () => {
  loading.value = true;
  try {
    const data = await request('/api/memory/list');
    items.value = Array.isArray(data.items) ? data.items : [];
  } finally { loading.value = false; }
};

const togglePin = async (item) => {
  if (!item.enabled) { await post('/api/memory/update', { id: item.id, enabled: true, pinned: true }); item.enabled = 1; item.pinned = 1; }
  else { await post('/api/memory/update', { id: item.id, pinned: !item.pinned }); item.pinned = item.pinned ? 0 : 1; }
};

const toggleEnable = async (item) => {
  const ne = !item.enabled;
  const u = { id: item.id, enabled: ne };
  if (!ne && item.pinned) u.pinned = false;
  await post('/api/memory/update', u);
  item.enabled = ne ? 1 : 0;
  if (!ne) item.pinned = 0;
};

const deleteItem = async (item) => {
  if (!confirm(`删除「${item.title}」?此操作不可撤销`)) return;
  await post('/api/memory/delete', { id: item.id });
  items.value = items.value.filter(i => i.id !== item.id);
};

const openEditor = async (item) => {
  editId.value = item ? item.id : null;
  if (item) {
    editTitle.value = item.title;
    editDescription.value = item.description || '';
    try { const d = await request(`/api/memory/get?id=${item.id}`); editContent.value = d.item.content; editDescription.value = d.item.description || ''; } catch { editContent.value = ''; }
  } else { editTitle.value = ''; editDescription.value = ''; editContent.value = ''; }
  editorOpen.value = true;
  nextTick(() => titleInput.value?.focus());
};

const closeEditor = () => { editorOpen.value = false; };

const saveEdit = async () => {
  if (!canSave.value || saving.value) return;
  saving.value = true;
  try {
    const payload = { title: editTitle.value.trim(), description: editDescription.value.trim(), content: editContent.value.trim() };
    if (editId.value) await post('/api/memory/update', { id: editId.value, ...payload });
    else await post('/api/memory/create', payload);
    editorOpen.value = false;
    await loadItems();
  } finally { saving.value = false; }
};

onMounted(loadItems);
</script>

<style scoped>
.app-frame { flex: 1; min-height: 0; min-width: 0; display: flex; flex-direction: column; background: var(--bg); }
.topbar { flex: none; height: 64px; display: flex; align-items: center; padding: 8px 16px; background: var(--bg); }
.topbar .brand { flex: 1; min-width: 0; margin: 0 4px 0 12px; }
.topbar .brand .name { font-size: 20px; font-weight: 500; letter-spacing: -0.01em; color: var(--text); }
.topbar .right { display: flex; align-items: center; gap: 4px; margin-left: auto; }
@media (max-width: 720px) {
  .topbar { padding: 8px; height: 56px; }
  .topbar .brand .name { font-size: 17px; }
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
